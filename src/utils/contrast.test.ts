import { describe, expect, it } from 'vitest';
import css from '@/GlobalStyle.tsx?raw';
import { contrastRatio, parseColor } from './contrast';

// Guard rail for the design tokens: every colour used as text must reach WCAG
// AA (4.5:1) on the app's backgrounds, in both themes. Reads the GlobalStyle
// source (Vite ?raw import) so a future token tweak that breaks contrast fails CI.

function tokens(blockStart: string): Record<string, string> {
  const start = css.indexOf(blockStart);
  const body  = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}

const dark  = tokens(':root {');
const light = { ...dark, ...tokens('[data-theme="light"] {') };

const AA = 4.5;
const TEXT_TOKENS = ['label', 'label2', 'label3', 'label4', 'gold', 'lemon', 'green', 'red'];

describe.each([
  ['dark',  dark],
  ['light', light],
])('%s theme', (_theme, t) => {
  it.each(TEXT_TOKENS)('--%s reaches AA on --bg and --bg2', (name) => {
    expect(contrastRatio(t[name], t.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(t[name], t.bg2)).toBeGreaterThanOrEqual(AA);
  });

  it('secondary labels stay distinguishable (label2 > label3 > label4)', () => {
    expect(parseColor(t.label2).a).toBeGreaterThan(parseColor(t.label3).a);
    expect(parseColor(t.label3).a).toBeGreaterThan(parseColor(t.label4).a);
  });
});

describe('primary button', () => {
  it('dark: black text on --gold reaches AA', () => {
    expect(contrastRatio('#000000', dark.gold)).toBeGreaterThanOrEqual(AA);
  });
  it('light: white text on --gold reaches AA', () => {
    expect(contrastRatio('#ffffff', light.gold)).toBeGreaterThanOrEqual(AA);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
  it('composites translucent text over the background', () => {
    // the old --label3 on black: the 2.3:1 the audit flagged
    expect(contrastRatio('rgba(235,235,245,0.3)', '#000000')).toBeCloseTo(2.25, 1);
  });
});
