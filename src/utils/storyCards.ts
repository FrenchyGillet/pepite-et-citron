import type { EntityId } from '@/types';

export type StoryCardKind = 'pepite' | 'citron' | 'podium';

interface Winner {
  id: EntityId;
  name: string;
  nickname?: string | null;
  pts: number;
}

export interface StoryCard {
  kind: StoryCardKind;
  /** The player on a Pépite or Citron card. */
  player?: { id: EntityId; name: string };
  /** The player on the card is the one holding this phone. */
  mine: boolean;
}

/**
 * The images Résultats offers to share, the first one as the main button:
 * the viewer's own card when they won something (people share what is about
 * them), else the night's Pépite, else the podium. A title shared by several
 * players gets no card: the podium shows them all.
 */
export function storyCards(r: {
  pepiteWinners: Winner[];
  lemonWinners: Winner[];
  /** Who this phone voted as (vote screen), if known. */
  viewerId?: EntityId | null;
}): StoryCard[] {
  const card = (kind: 'pepite' | 'citron', winners: Winner[]): StoryCard[] => {
    if (winners.length !== 1 || winners[0].pts <= 0) return [];
    const w = winners[0];
    return [{
      kind,
      player: { id: w.id, name: w.nickname?.trim() || w.name },
      mine: r.viewerId != null && String(r.viewerId) === String(w.id),
    }];
  };
  const cards = [...card('pepite', r.pepiteWinners), ...card('citron', r.lemonWinners), { kind: 'podium' as const, mine: false }];
  const mine = cards.findIndex(c => c.mine);
  return mine > 0 ? [cards[mine], ...cards.filter((_, i) => i !== mine)] : cards;
}
