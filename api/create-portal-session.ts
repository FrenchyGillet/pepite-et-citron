import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orgId } = req.body as { orgId?: string };
  if (!orgId) return res.status(400).json({ error: 'Missing orgId' });

  const { data: org, error } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (error || !org?.stripe_customer_id) {
    return res.status(404).json({ error: 'Aucun abonnement actif trouvé' });
  }

  const appUrl = process.env.VITE_APP_URL || 'https://pepite-citron.com';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   org.stripe_customer_id,
    return_url: `${appUrl}/`,
  });

  return res.status(200).json({ url: portalSession.url });
}
