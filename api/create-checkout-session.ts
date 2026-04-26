import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Service role: bypass RLS to verify the org exists
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PRICE_IDS: Record<'monthly' | 'annual', string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual:  process.env.STRIPE_PRICE_ANNUAL!,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orgId, plan } = req.body as { orgId?: string; plan?: 'monthly' | 'annual' };

  if (!orgId || !plan || !PRICE_IDS[plan]) {
    return res.status(400).json({ error: 'Missing or invalid orgId / plan' });
  }

  // Verify org exists (basic guard — no auth check needed for checkout creation,
  // Stripe still requires a real payment to complete).
  const { data: org, error } = await supabase
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
