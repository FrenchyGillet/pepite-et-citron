import { t } from '@/i18n';
import { INSTAGRAM_HANDLE } from '@/config';
import { PODIUM_IMAGE_COLORS } from '@/utils/generatePodiumImage';
import type { MascotLine } from '@/utils/mascots';

export type WinnerCardKind = 'pepite' | 'citron';

/**
 * Story format. Instagram covers the top (profile, progress bar) and the
 * bottom (reply bar, stickers): nothing is drawn there.
 */
export const CARD_SIZE = { W: 1080, H: 1920 } as const;
export const CARD_SAFE = { top: 250, bottom: 340 } as const;

interface WinnerCardOptions {
  kind: WinnerCardKind;
  /** The player's name as shown in the app (nickname first). */
  name: string;
  matchLabel: string;
  matchDate: string;
  /** One bubble, spoken by the card's own mascot (cardPepite / cardCitron). */
  mascotLine: MascotLine | null;
  isDark?: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Largest font size (step 4px) at which the text fits maxW, floored at min. */
export function fitFontSize(measure: (size: number) => number, maxW: number, max: number, min: number): number {
  let size = max;
  while (size > min && measure(size) > maxW) size -= 4;
  return size;
}

/**
 * The night's Pépite or Citron on a card of their own, in the style of the
 * Instagram account: dark background, the title in the mascot's colour, the
 * name very large, the mascot and one line, where it comes from.
 */
export async function generateWinnerCard({
  kind, name, matchLabel, matchDate, mascotLine, isDark = true,
}: WinnerCardOptions): Promise<Blob> {
  await document.fonts.ready;
  const bubble = mascotLine?.[0] ?? null;
  const face = await loadImage(bubble
    ? `/mascots/${bubble.who}-${bubble.mood}.png`
    : kind === 'pepite' ? '/mascots/pepite-fiere.png' : '/mascots/citron-sourire-en-coin.png');

  const { W, H } = CARD_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const c = PODIUM_IMAGE_COLORS[isDark ? 'dark' : 'light'];
  const accent = kind === 'pepite' ? c.gold : c.lemon;
  const FONT = '"SF Pro Display", system-ui, -apple-system, sans-serif';
  const PAD = 80;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 900, 0, W / 2, 900, 700);
  glow.addColorStop(0, kind === 'pepite' ? 'rgba(255,214,10,0.10)' : 'rgba(170,221,0,0.09)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Title, like « CITRON A DIT » on the account.
  let y = CARD_SAFE.top + 80;
  ctx.font = `800 44px ${FONT}`;
  ctx.fillStyle = accent;
  ctx.fillText(t(kind === 'pepite' ? 'podiumImage.cardPepite' : 'podiumImage.cardCitron'), W / 2, y);

  // The name, as large as it fits.
  const nameMax = W - PAD * 2;
  const size = fitFontSize(s => { ctx.font = `800 ${s}px ${FONT}`; return ctx.measureText(name).width; }, nameMax, 170, 72);
  ctx.font = `800 ${size}px ${FONT}`;
  let shown = name;
  while (shown.length > 1 && ctx.measureText(shown).width > nameMax) shown = shown.slice(0, -2) + '…';
  y += 40 + size;
  ctx.fillStyle = c.t1;
  ctx.fillText(shown, W / 2, y);

  y += 70;
  ctx.font = `400 34px ${FONT}`;
  ctx.fillStyle = c.t3;
  ctx.fillText(`${matchLabel}  ·  ${matchDate}`, W / 2, y, nameMax);

  // The mascot, then its bubble, the tail pointing up at it.
  const FACE = 520;
  const faceTop = y + 50;
  if (face) ctx.drawImage(face, (W - FACE) / 2, faceTop, FACE, FACE);

  if (bubble) {
    ctx.font = `600 44px ${FONT}`;
    const maxText = W - PAD * 2 - 80;
    const lines: string[] = [];
    let line = '';
    for (const word of bubble.text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxText && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    const LH = 58, BP = 40;
    const shownLines = lines.slice(0, 3);
    const bh = shownLines.length * LH + BP * 2 - 10;
    const bx = PAD, bw = W - PAD * 2, by = faceTop + FACE + 40;
    ctx.fillStyle = c.bubble;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 36);
    ctx.moveTo(W / 2 - 26, by);
    ctx.lineTo(W / 2, by - 30);
    ctx.lineTo(W / 2 + 26, by);
    ctx.fill();
    ctx.fillStyle = c.t1;
    ctx.textBaseline = 'top';
    shownLines.forEach((l, i) => ctx.fillText(l, W / 2, by + BP + i * LH));
    ctx.textBaseline = 'alphabetic';
  }

  // Where it comes from, above Instagram's bottom bar.
  const foot = H - CARD_SAFE.bottom;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillStyle = c.gold;
  ctx.fillText('pepite-citron.com', W / 2, foot - 50);
  if (INSTAGRAM_HANDLE) {
    ctx.font = `500 32px ${FONT}`;
    ctx.fillStyle = c.t3;
    ctx.fillText(`@${INSTAGRAM_HANDLE}`, W / 2, foot);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to generate image blob')), 'image/png');
  });
}
