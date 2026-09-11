import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireOrgAdmin } from './_lib/auth.js';
import { checkoutSessionSchema } from './_lib/validation.js';
import { stripeErrorDetail } from './_lib/stripeError.js';
import { stripePriceId } from './_lib/stripePrice.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<'monthly' | 'annual', string | undefined> = {
  monthly: stripePriceId(process.env.STRIPE_PRICE_MONTHLY, 'STRIPE_PRICE_MONTHLY'),
  annual:  stripePriceId(process.env.STRIPE_PRICE_ANNUAL,  'STRIPE_PRICE_ANNUAL'),
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
    .select('id, name, plan, stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    return res.status(404).json({ error: 'Organisation introuvable' });
  }

  // A second checkout would start a second, parallel subscription: the team
  // would be billed twice. Plan changes go through the billing portal.
  if (org.plan === 'pro') {
    return res.status(409).json({
      error: 'Ton équipe est déjà en Pro. Gère ton abonnement dans Admin → Paramètres.',
      code:  'already_pro',
    });
  }

  const appUrl = process.env.VITE_APP_URL || 'https://pepite-citron.com';

  try {
    const session = await stripe.checkout.sessions.create({
      mode:       'subscription',
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      // Pre-fill customer if they already paid before (subscription change)
      ...(org.stripe_customer_id ? { customer: org.stripe_customer_id } : {}),
      // Back into the app: "/" is the marketing landing page (vercel.json).
      success_url:            `${appUrl}/vote?upgrade=success`,
      cancel_url:             `${appUrl}/admin`,
      allow_promotion_codes:  true,
      locale:                 'fr',
      metadata:               { orgId },
      // Also on the subscription, so the webhook can find the team from
      // subscription events that arrive before checkout.session.completed.
      subscription_data:      { metadata: { orgId } },
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('stripe.checkout.sessions.create failed:', err);
    return res.status(502).json({
      error:  'Le paiement est momentanément indisponible. Réessaie dans un instant.',
      detail: stripeErrorDetail(err),
    });
  }
}
