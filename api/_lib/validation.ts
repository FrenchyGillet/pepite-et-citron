import { z } from 'zod';

/**
 * Server-side revalidation of request bodies. The client validates too, but
 * serverless endpoints must never trust client input — see api/_lib/auth.ts.
 */

const orgId = z.string().trim().min(1).max(100);
// No control characters — keeps the label safe for email subjects and headers.
const matchLabel = z.string().trim().min(1).max(100).regex(/^[^\p{Cc}]+$/u);

export const matchNotificationSchema = z.object({
  orgId,
  matchLabel,
  matchId: z.string().trim().max(100).optional(),
});

export const pushNotificationSchema = z.object({
  orgId,
  type: z.enum(['vote_open', 'results_ready', 'vote_reminder']),
  matchLabel,
  matchId: z.string().trim().max(100).optional(),
}).refine(b => b.type !== 'vote_reminder' || !!b.matchId, { message: 'matchId requis', path: ['matchId'] });

export const checkoutSessionSchema = z.object({
  orgId,
  plan: z.enum(['monthly', 'annual']),
});

export const portalSessionSchema = z.object({ orgId });
