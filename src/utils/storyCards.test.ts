import { describe, expect, it } from 'vitest';
import { storyCards } from './storyCards';

const w = (id: number, pts = 5, nickname: string | null = null) => ({ id, name: `P${id}`, nickname, pts });

describe('storyCards', () => {
  it('offers the Pépite card first, then the Citron card, then the podium', () => {
    expect(storyCards({ pepiteWinners: [w(1)], lemonWinners: [w(2)] }).map(c => c.kind))
      .toEqual(['pepite', 'citron', 'podium']);
  });

  it("puts the viewer's own card first", () => {
    const cards = storyCards({ pepiteWinners: [w(1)], lemonWinners: [w(2)], viewerId: '2' });
    expect(cards.map(c => [c.kind, c.mine])).toEqual([['citron', true], ['pepite', false], ['podium', false]]);
  });

  it('shows the nickname, and no card for a shared or empty title', () => {
    expect(storyCards({ pepiteWinners: [w(1, 5, ' Zizou ')], lemonWinners: [] })[0].player?.name).toBe('Zizou');
    expect(storyCards({ pepiteWinners: [w(1), w(3)], lemonWinners: [w(2, 0)] }).map(c => c.kind)).toEqual(['podium']);
  });
});
