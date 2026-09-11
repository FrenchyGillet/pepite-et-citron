import { afterEach, describe, expect, it, vi } from 'vitest';
import { stripePriceId } from './stripePrice';

afterEach(() => vi.restoreAllMocks());

describe('stripePriceId', () => {
  it('keeps a clean price id as is', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(stripePriceId('price_1TQLGdEP17P1n6PPR5QD4IBN')).toBe('price_1TQLGdEP17P1n6PPR5QD4IBN');
    expect(warn).not.toHaveBeenCalled();
  });

  it('strips stray characters, spaces and quotes around the id, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(stripePriceId('Iprice_1TQLGdEP17P1n6PPR5QD4IBN', 'STRIPE_PRICE_ANNUAL')).toBe('price_1TQLGdEP17P1n6PPR5QD4IBN');
    expect(stripePriceId(' "price_abc123"\n')).toBe('price_abc123');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('STRIPE_PRICE_ANNUAL'));
  });

  it('returns undefined without a price id', () => {
    expect(stripePriceId(undefined)).toBeUndefined();
    expect(stripePriceId('prod_123')).toBeUndefined();
    expect(stripePriceId('')).toBeUndefined();
  });
});
