import { MASCOT_LINES } from '@/i18n/mascots';
import { useLang, useT } from '@/i18n';
import { pickMascotLine, type MascotBubble, type MascotSituation } from '@/utils/mascots';

/** Every mood is drawn in public/mascots/ (checked by utils/mascots.test.ts). */
function imageOf(b: MascotBubble): string {
  return `/mascots/${b.who}-${b.mood}.png`;
}

interface MascotTalkProps {
  /** Lines of these situations are pooled. */
  situations: MascotSituation[];
  /** Same seed, same line: a match id, a day… */
  seed: string;
  vars?: Record<string, string | number>;
}

/** Citron speaks from the left, Pépite from the right. */
export function MascotTalk({ situations, seed, vars }: MascotTalkProps) {
  const lang = useLang();
  const t = useT();
  const line = pickMascotLine(MASCOT_LINES[lang], situations, seed, vars);
  if (!line) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
      {line.map((b, i) => {
        const right = b.who === 'pepite';
        return (
          // Comic strip: the bubble floats above the speaker's head, its tail
          // pointing down at them.
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-end', gap: 4,
            flexDirection: right ? 'row-reverse' : 'row',
            animation: `revealPop 0.35s ease ${i * 0.5}s both`,
          }}>
            <img src={imageOf(b)} alt={t(`mascots.${b.who}`)} width={64} height={64}
              style={{ flexShrink: 0, objectFit: 'contain' }} />
            <p style={{
              position: 'relative', margin: '0 0 44px', padding: '10px 14px', background: 'var(--bg2)',
              borderRadius: 16, fontSize: 14, lineHeight: 1.45, color: 'var(--label)',
              textAlign: 'left', maxWidth: 'calc(100% - 68px)',
            }}>
              {b.text}
              <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true" style={{
                position: 'absolute', bottom: -12, [right ? 'right' : 'left']: 10,
                transform: right ? 'scaleX(-1)' : undefined,
              }}>
                <path d="M4 0 H16 L0 14 Z" fill="var(--bg2)" />
              </svg>
            </p>
          </div>
        );
      })}
    </div>
  );
}
