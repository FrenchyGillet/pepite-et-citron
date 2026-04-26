import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Service role bypasses RLS — only used server-side in this webhook
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Disable Vercel's default body parser: Stripe needs the raw body to verify
// the webhook signature.
export const config = { api: { bodyParser: false } };

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig     = req.headers['stripe-signature'] as string;
  const rawBody = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('Stripe webhook signature mismatch:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // ── Event handlers ──────────────────────────────────────────────────────────

  switch (event.type) {

    // Payment successful → activate Pro plan
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId   = session.metadata?.orgId;
      if (!orgId) { console.warn('checkout.session.completed: no orgId in metadata'); break; }

      const { error } = await supabase
        .from('organizations')
        .update({
          plan:                    'pro',
          stripe_customer_id:      session.customer      as string,
          stripe_subscription_id:  session.subscription  as string,
        })
        .eq('id', orgId);

      if (error) console.error('DB update failed (checkout.session.completed):', error);
      break;
    }

    // Subscription cancelled → downgrade to Free
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;

      const { error } = await supabase
        .from('organizations')
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id);

      if (error) console.error('DB update failed (customer.subscription.deleted):', error);
      break;
    }

    // Payment failed / subscription paused → downgrade if no longer active
    case 'customer.subscription.updated': {
      const sub   = event.data.object as Stripe.Subscription;
      const isPro = ['active', 'trialing'].includes(sub.status);

      const { error } = await supabase
        .from('organizations')
        .update({ plan: isPro ? 'pro' : 'free' })
        .eq('stripe_subscription_id', sub.id);

      if (error) console.error('DB update failed (customer.subscription.updated):', error);
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  return res.status(200).json({ received: true });
}
