import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireOrgAdmin } from './_lib/auth.js';
import { portalSessionSchema } from './_lib/validation.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = portalSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Requête invalide' });
  const { orgId } = parsed.data;

  // Only an admin of this org may open its Stripe billing portal.
  const auth = await requireOrgAdmin(req, orgId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const { data: org, error } = await supabaseAdmin
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
