/**
 * Stripe's error code and message (e.g. "resource_missing · line_items[0][price]:
 * No such price") for the admin who clicked. Contains no secret; without it a
 * failed checkout is only visible in the Vercel logs.
 */
export function stripeErrorDetail(err: unknown): string | undefined {
  const e = err as { code?: string; param?: string; message?: string } | null;
  if (!e?.message) return undefined;
  const head = [e.code, e.param].filter(Boolean).join(' · ');
  return (head ? `${head}: ${e.message}` : e.message).slice(0, 300);
}
