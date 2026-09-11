/**
 * Reads a Stripe price id from an env value, tolerating stray characters
 * around it: a value pasted as "Iprice_1TQ…" (extra leading character) made
 * every checkout fail with "No such price". Returns undefined when no
 * price_… id is present.
 */
export function stripePriceId(raw: string | undefined, envName = 'STRIPE_PRICE_*'): string | undefined {
  const id = raw?.match(/price_[A-Za-z0-9]+/)?.[0];
  if (id && id !== raw) {
    console.warn(`${envName} contains extra characters around the price id; using ${id}. Fix the value in Vercel.`);
  }
  return id;
}
