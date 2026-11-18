import { useState } from 'react';
import { generatePodiumImage } from '@/utils/generatePodiumImage';
import { generateWinnerCard } from '@/utils/generateWinnerCard';
import { storyCards, type StoryCard } from '@/utils/storyCards';
import { getStoredVoterIdentity } from '@/utils/vote';
import { pickMascotLine, type MascotLine } from '@/utils/mascots';
import { viewerSeed } from '@/utils/viewer';
import { track, EVENTS } from '@/utils/analytics';
import { sharedLandingUrl } from '@/utils/share';
import { MASCOT_LINES } from '@/i18n/mascots';
import { INSTAGRAM_HANDLE } from '@/config';
import { dateLocale, getLang, t } from '@/i18n';
import type { RankedPlayer, RankedLemonPlayer } from '@/utils/scoring';
import type { Match } from '@/types';

interface ShareStoryPanelProps {
  orgId: string | null | undefined;
  match: Match;
  pepiteRanked: RankedPlayer[];
  lemonRanked: RankedLemonPlayer[];
  pepiteWinners: RankedPlayer[];
  lemonWinners: RankedLemonPlayer[];
  /** The mascots' line on the podium, drawn on the podium image. */
  podiumLine: MascotLine | null;
  isDark: boolean;
}

type ShareState = 'idle' | 'generating' | 'error';

/**
 * Right under the podium, while the team is still looking at it: one main
 * button (the viewer's own card, else the Pépite's), the other images next
 * to it, and a reminder to mention the account once something is shared.
 */
export function ShareStoryPanel({
  orgId, match, pepiteRanked, lemonRanked, pepiteWinners, lemonWinners, podiumLine, isDark,
}: ShareStoryPanelProps) {
  const [busy, setBusy] = useState<{ kind: StoryCard['kind']; state: ShareState } | null>(null);
  const [shared, setShared] = useState(false);

  const cards = storyCards({ pepiteWinners, lemonWinners, viewerId: getStoredVoterIdentity(orgId)?.playerId });
  const matchDate = new Date(match.created_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

  const makeImage = (card: StoryCard): Promise<Blob> => {
    if (card.kind === 'podium' || !card.player) {
      return generatePodiumImage({ matchLabel: match.label, matchDate, pepiteRanked, lemonRanked, mascotLine: podiumLine, isDark });
    }
    const situation = card.kind === 'pepite' ? 'cardPepite' : 'cardCitron';
    // Like every mascot line, each phone draws its own.
    const line = pickMascotLine(MASCOT_LINES[getLang()], [situation], viewerSeed(`card:${card.kind}:${match.id}`));
    return generateWinnerCard({ kind: card.kind, name: card.player.name, matchLabel: match.label, matchDate, mascotLine: line, isDark });
  };

  const share = async (card: StoryCard) => {
    if (busy?.state === 'generating') return;
    setBusy({ kind: card.kind, state: 'generating' });
    const event = { card: card.kind, mine: card.mine };
    try {
      const blob = await makeImage(card);
      const filename = `${card.kind}-${match.label}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('share.title', { match: match.label }),
          // A story keeps no caption: the handle is on the image too.
          text: t('share.text', { url: sharedLandingUrl(card.kind === 'podium' ? 'podium' : 'card') }) + (INSTAGRAM_HANDLE ? ` @${INSTAGRAM_HANDLE}` : ''),
        });
        track(EVENTS.PODIUM_SHARED, { method: 'share', ...event });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        track(EVENTS.PODIUM_SHARED, { method: 'download', ...event });
      }
      setBusy(null);
      setShared(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') { setBusy(null); return; }
      console.error('ShareStoryPanel:', err);
      setBusy({ kind: card.kind, state: 'error' });
      setTimeout(() => setBusy(null), 3000);
    }
  };

  const label = (card: StoryCard, main: boolean): string => {
    if (busy?.kind === card.kind && busy.state === 'generating') return t('share.generating');
    if (busy?.kind === card.kind && busy.state === 'error') return t('share.error');
    if (card.kind === 'podium') return main ? t('share.idle') : t('share.podium');
    if (card.mine) return t(card.kind === 'pepite' ? 'share.myPepite' : 'share.myCitron');
    if (main) return t('share.cardOf', { name: card.player?.name ?? '' });
    return t(card.kind === 'pepite' ? 'share.pepiteCard' : 'share.citronCard');
  };

  const [main, ...others] = cards;
  const disabled = busy?.state === 'generating';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button className="btn btn-primary btn-full" disabled={disabled} onClick={() => share(main)}
        style={{ fontSize: 16, fontWeight: 800, gap: 8 }}>
        <ShareIcon />
        {label(main, true)}
      </button>
      {others.length > 0 && (
        <div style={{ display: 'flex', gap: 10 }}>
          {others.map(card => (
            <button key={card.kind} className="btn btn-secondary" disabled={disabled} onClick={() => share(card)}
              style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              {label(card, false)}
            </button>
          ))}
        </div>
      )}
      {shared && INSTAGRAM_HANDLE && (
        <p role="status" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--label2)', textAlign: 'center' }}>
          {t('share.mention', { handle: INSTAGRAM_HANDLE })}
        </p>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
