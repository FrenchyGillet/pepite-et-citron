import { beforeEach, describe, expect, it } from 'vitest';
import { parseUpgradePlan, saveUpgradeIntent, takeUpgradeIntent } from './signupIntent';

beforeEach(() => sessionStorage.clear());

describe('upgrade intent', () => {
  it('accepts only the two plans', () => {
    expect(parseUpgradePlan('annual')).toBe('annual');
    expect(parseUpgradePlan('monthly')).toBe('monthly');
    expect(parseUpgradePlan('weekly')).toBeNull();
    expect(parseUpgradePlan(null)).toBeNull();
  });

  it('is read once, then forgotten', () => {
    saveUpgradeIntent('monthly');
    expect(takeUpgradeIntent()).toBe('monthly');
    expect(takeUpgradeIntent()).toBeNull();
  });

  it('ignores a tampered value', () => {
    sessionStorage.setItem('pepite_upgrade_intent', 'free-forever');
    expect(takeUpgradeIntent()).toBeNull();
  });
});
