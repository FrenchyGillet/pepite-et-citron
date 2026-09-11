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

// Stripe v22 removed current_period_end from the TypeScript Subscription type
// (billing moved to a per-item model), but the field is still present at runtime
// for subscriptions using the legacy fixed billing mode.
type SubscriptionWithPeriod = Stripe.Subscription & { current_period_end?: number };

function getPeriodEnd(sub: SubscriptionWithPeriod): string | null {
  const ts = sub.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

// Stripe v22: invoice.subscription was moved to invoice.parent.subscription_details.subscription
function getInvoiceSubId(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  if (!details) return null;
  const sub = details.subscription;
  return typeof sub === 'string' ? sub : (sub?.id ?? null);
}

type OrgPatch = Record<string, string | boolean | null>;

/**
 * Updates the matching organizations and returns how many rows changed.
 * Throws on a database error: the handler then answers 500 so Stripe retries
 * the event (it retries for up to 3 days). Answering 200 would drop it and
 * leave a paying team on the free plan.
 */
async function updateOrgs(label: string, patch: OrgPatch, column: 'id' | 'stripe_subscription_id', value: string): Promise<number> {
  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq(column, value)
    .select('id');
  if (error) throw new Error(`DB update failed (${label}): ${error.message}`);
  return (data as unknown[] | null)?.length ?? 0;
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

  try {
    await handleEvent(event);
  } catch (err) {
    // Transient failure (database or Stripe API): let Stripe retry. Every
    // handler below sets absolute state, so replaying an event is harmless.
    console.error(`Stripe webhook ${event.type} failed, Stripe will retry:`, err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  return res.status(200).json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {

    // ── New subscription ───────────────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId   = session.metadata?.orgId;
      if (!orgId) { console.warn('checkout.session.completed: no orgId in metadata'); return; }

      // Period details are a nice-to-have here: invoice.paid fills them in too,
      // so a failed lookup must not block the upgrade.
      let periodEnd: string | null = null;
      if (session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string) as SubscriptionWithPeriod;
          periodEnd = getPeriodEnd(sub);
        } catch (e) {
          console.error('Could not retrieve subscription for period_end:', e);
        }
      }

      const n = await updateOrgs('checkout.session.completed', {
        plan:                   'pro',
        stripe_customer_id:     session.customer     as string,
        stripe_subscription_id: session.subscription as string,
        current_period_end:     periodEnd,
        cancel_at_period_end:   false,
        last_payment_failed_at: null,
      }, 'id', orgId);
      // The team was deleted in the meantime: retrying cannot help.
      if (n === 0) console.error(`checkout.session.completed: organization ${orgId} not found`);
      return;
    }

    // ── Subscription state change (renewal, cancellation request, payment failure) ─
    case 'customer.subscription.updated': {
      // Stripe does not guarantee delivery order, and a retried event can
      // arrive after newer ones: read the subscription's current state rather
      // than trusting the event snapshot.
      const eventSub = event.data.object as Stripe.Subscription;
      const sub = await stripe.subscriptions.retrieve(eventSub.id) as SubscriptionWithPeriod;
      const patch: OrgPatch = {
        plan:                 isPlanPro(sub.status) ? 'pro' : 'free',
        current_period_end:   getPeriodEnd(sub),
        cancel_at_period_end: sub.cancel_at_period_end,
        // Clear payment failure flag if back to healthy
        ...(sub.status === 'active' ? { last_payment_failed_at: null } : {}),
      };

      const n = await updateOrgs('customer.subscription.updated', patch, 'stripe_subscription_id', sub.id);
      // Arrived before checkout.session.completed linked the subscription:
      // fall back on the team id stamped on the subscription at checkout.
      const orgId = sub.metadata?.orgId;
      if (n === 0 && orgId) {
        await updateOrgs('customer.subscription.updated (by org)', {
          ...patch,
          stripe_subscription_id: sub.id,
          stripe_customer_id:     typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        }, 'id', orgId);
      }

      // Log graceful cancellation requests (access retained until period end)
      if (sub.cancel_at_period_end) {
        console.info(`Subscription ${sub.id} set to cancel at period end (${getPeriodEnd(sub)})`);
      }
      return;
    }

    // ── Subscription fully cancelled (after period end or immediately) ─────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await updateOrgs('customer.subscription.deleted', {
        plan:                   'free',
        stripe_subscription_id: null,
        current_period_end:     null,
        cancel_at_period_end:   false,
        last_payment_failed_at: null,
      }, 'stripe_subscription_id', sub.id);
      return;
    }

    // ── Invoice paid (subscription renewal confirmation) ───────────────────────
    // Safety net: idempotently re-confirms Pro on each successful renewal.
    // Fixes any DB inconsistency without relying solely on subscription.updated.
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId   = getInvoiceSubId(invoice);
      if (!subId) return;

      const sub = await stripe.subscriptions.retrieve(subId) as SubscriptionWithPeriod;
      await updateOrgs('invoice.paid', {
        plan:                   'pro',
        current_period_end:     getPeriodEnd(sub),
        last_payment_failed_at: null,
      }, 'stripe_subscription_id', subId);
      return;
    }

    // ── Payment failure ────────────────────────────────────────────────────────
    // Stripe retries automatically (smart retry). We record the failure timestamp
    // for visibility and future email notifications, but do NOT downgrade yet —
    // customer.subscription.updated will fire with status 'past_due' (still Pro)
    // and eventually 'unpaid'/'canceled' (→ Free) if all retries fail.
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId   = getInvoiceSubId(invoice);

      console.warn('invoice.payment_failed:', {
        customer:     invoice.customer,
        subscription: subId,
        attempt:      invoice.attempt_count,
        amount_due:   invoice.amount_due,
        currency:     invoice.currency,
      });

      if (subId) {
        await updateOrgs('invoice.payment_failed',
          { last_payment_failed_at: new Date().toISOString() }, 'stripe_subscription_id', subId);
      }
      return;
    }

    default:
      // Unhandled event types — safely ignored
      return;
  }
}
