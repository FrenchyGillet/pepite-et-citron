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

// Statuses that mean the subscription is effectively active.
// Note: 'past_due' is intentionally included — Stripe retries payment for several
// days before cancelling. Downgrading immediately on first failure is overly
// aggressive; we wait for Stripe to give up (status → 'unpaid' | 'canceled').
const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due'];

function isPlanPro(status: Stripe.Subscription.Status): boolean {
  return ACTIVE_STATUSES.includes(status);
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

    // ── New subscription ───────────────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId   = session.metadata?.orgId;
      if (!orgId) { console.warn('checkout.session.completed: no orgId in metadata'); break; }

      // Retrieve subscription to get period details
      let periodEnd: string | null = null;
      if (session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        } catch (e) {
          console.error('Could not retrieve subscription for period_end:', e);
        }
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          plan:                   'pro',
          stripe_customer_id:     session.customer     as string,
          stripe_subscription_id: session.subscription as string,
          current_period_end:     periodEnd,
          cancel_at_period_end:   false,
          last_payment_failed_at: null,
        })
        .eq('id', orgId);

      if (error) console.error('DB update failed (checkout.session.completed):', error);
      break;
    }

    // ── Subscription state change (renewal, cancellation request, payment failure) ─
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const pro = isPlanPro(sub.status);

      const { error } = await supabase
        .from('organizations')
        .update({
          plan:                 pro ? 'pro' : 'free',
          current_period_end:   new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          // Clear payment failure flag if back to healthy
          ...(sub.status === 'active' ? { last_payment_failed_at: null } : {}),
        })
        .eq('stripe_subscription_id', sub.id);

      if (error) console.error('DB update failed (customer.subscription.updated):', error);

      // Log graceful cancellation requests (access retained until period end)
      if (sub.cancel_at_period_end) {
        const end = new Date(sub.current_period_end * 1000).toLocaleDateString('fr-BE');
        console.info(`Subscription ${sub.id} set to cancel at period end (${end})`);
      }
      break;
    }

    // ── Subscription fully cancelled (after period end or immediately) ─────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;

      const { error } = await supabase
        .from('organizations')
        .update({
          plan:                   'free',
          stripe_subscription_id: null,
          current_period_end:     null,
          cancel_at_period_end:   false,
          last_payment_failed_at: null,
        })
        .eq('stripe_subscription_id', sub.id);

      if (error) console.error('DB update failed (customer.subscription.deleted):', error);
      break;
    }

    // ── Invoice paid (subscription renewal confirmation) ───────────────────────
    // Safety net: idempotently re-confirms Pro on each successful renewal.
    // Fixes any DB inconsistency without relying solely on subscription.updated.
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId   = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
      if (!subId) break;

      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const { error } = await supabase
          .from('organizations')
          .update({
            plan:                   'pro',
            current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
            last_payment_failed_at: null,
          })
          .eq('stripe_subscription_id', subId);

        if (error) console.error('DB update failed (invoice.paid):', error);
      } catch (e) {
        console.error('Could not retrieve subscription for invoice.paid:', e);
      }
      break;
    }

    // ── Payment failure ────────────────────────────────────────────────────────
    // Stripe retries automatically (smart retry). We record the failure timestamp
    // for visibility and future email notifications, but do NOT downgrade yet —
    // customer.subscription.updated will fire with status 'past_due' (still Pro)
    // and eventually 'unpaid'/'canceled' (→ Free) if all retries fail.
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId   = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

      console.warn('invoice.payment_failed:', {
        customer:    invoice.customer,
        subscription: subId,
        attempt:     invoice.attempt_count,
        amount_due:  invoice.amount_due,
        currency:    invoice.currency,
      });

      if (subId) {
        const { error } = await supabase
          .from('organizations')
          .update({ last_payment_failed_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);

        if (error) console.error('DB update failed (invoice.payment_failed):', error);
      }
      break;
    }

    default:
      // Unhandled event types — safely ignored
      break;
  }

  return res.status(200).json({ received: true });
}
