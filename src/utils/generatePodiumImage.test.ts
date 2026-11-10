import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { PODIUM_IMAGE_COLORS } from './generatePodiumImage';

// The shared story is read on a phone, often outdoors: every text colour of
// the image reaches WCAG AA on what it is drawn on.
const AA = 4.5;

describe.each(Object.entries(PODIUM_IMAGE_COLORS))('podium image, %s', (_theme, c) => {
  it.each([
    ['title, names', c.t1, c.bg], ['secondary', c.t2, c.bg], ['points, date, tagline', c.t3, c.bg],
    ['Pépite', c.gold, c.bg], ['step numbers', c.stepText, c.step],
    ['« Le Citron »', c.t2, c.lemonBox], ['Citron name and points', c.lemon, c.lemonBox],
    ['mascot bubbles', c.t1, c.bubble], ['winning step number', '#000000', c.goldFill],
  ])('%s', (_what, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA);
  });
});
