import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { requireOrgAdmin } from './_lib/auth';
import { checkoutSessionSchema } from './_lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<'monthly' | 'annual', string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual:  process.env.STRIPE_PRICE_ANNUAL!,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = checkoutSessionSchema.safeParse(req.body);
  if (!parsed.success || !PRICE_IDS[parsed.data.plan]) {
    return res.status(400).json({ error: 'Requête invalide' });
  }
  const { orgId, plan } = parsed.data;

  // Only an admin of this org may start a subscription for it.
  const auth = await requireOrgAdmin(req, orgId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const { data: org, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    return res.status(404).json({ error: 'Organisation introuvable' });
  }

  const appUrl = process.env.VITE_APP_URL || 'https://pepite-citron.com';

  const session = await stripe.checkout.sessions.create({
    mode:       'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    // Pre-fill customer if they already paid before (subscription change)
    ...(org.stripe_customer_id ? { customer: org.stripe_customer_id } : {}),
    success_url:            `${appUrl}/?upgrade=success`,
    cancel_url:             `${appUrl}/`,
    allow_promotion_codes:  true,
    locale:                 'fr',
    metadata:               { orgId },
  });

  return res.status(200).json({ url: session.url });
}
