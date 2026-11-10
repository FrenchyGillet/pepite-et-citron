import { t } from '@/i18n';
import { isAvatarColor, playerAvatar } from '@/utils/avatar';
import type { MascotLine } from '@/utils/mascots';
import { INSTAGRAM_HANDLE } from '@/config';
// ── Canvas-local helpers (no external imports needed) ─────────────────────────

/** Deterministic HSL color from a seed string (matches avatarColor in player.ts) */
function seedHSL(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return `hsl(${h % 360}, 65%, 55%)`;
}

/** 1-2 uppercase initials from a display name */
function playerInitials(name: string): string {
  const parts = name.trim().replace(/\s+/g, ' ').split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Image colours, opaque so their contrast is checked (generatePodiumImage.test):
 * the same brand colours as the app's tokens (GlobalStyle), text at WCAG AA
 * on the background it is drawn on.
 */
export const PODIUM_IMAGE_COLORS = {
  dark: {
    bg: '#1C1C1E', bubble: '#2C2C2E', step: '#3A3A3C', lemonBox: '#31391A', lemonEdge: '#4C5A1A', sep: '#38383A',
    t1: '#FFFFFF', t2: '#D1D1D6', t3: '#A1A1A6', stepText: '#D1D1D6', gold: '#FFD60A', goldFill: '#FFD60A', lemon: '#AADD00',
  },
  light: {
    bg: '#F2F2F7', bubble: '#FFFFFF', step: '#D1D1D6', lemonBox: '#E1E8D6', lemonEdge: '#C3D1AE', sep: '#C6C6C8',
    t1: '#000000', t2: '#3A3A3C', t3: '#5C5C61', stepText: '#3A3A3C', gold: '#8A6500', goldFill: '#FFCC00', lemon: '#3F6100',
  },
} as const;

interface RankedEntry {
  name: string;
  nickname?: string | null;
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  pts: number;
  absent?: boolean;
  /** Competition rank from rankWithTies — ex-aequo share rank 1. */
  rank?: number;
}

interface GeneratePodiumImageOptions {
  matchLabel: string;
  matchDate: string;
  pepiteRanked: RankedEntry[];
  lemonRanked: RankedEntry[];
  /** Pépite and Citron's line on the night (revealMascot), drawn under the podium. */
  mascotLine?: MascotLine | null;
  isDark?: boolean;
}

/** A mascot drawing from public/mascots/, or null if it cannot load. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * The podium as a PNG, in story format (1080×1920): Instagram and WhatsApp
 * stories, and any team chat. The top and bottom 180 px stay clear of the
 * story interface. Pépite and Citron comment the night under the podium.
 */
export async function generatePodiumImage({
  matchLabel,
  matchDate,
  pepiteRanked,
  lemonRanked,
  mascotLine = null,
  isDark = true,
}: GeneratePodiumImageOptions): Promise<Blob> {
  await document.fonts.ready;
  const [citronFace, ...mascotImages] = await Promise.all([
    loadImage('/mascots/citron-sourire-en-coin.png'),
    ...(mascotLine ?? []).map(b => loadImage(`/mascots/${b.who}-${b.mood}.png`)),
  ]);

  const W = 1080, H = 1920;
  // The podium block (designed at 1080×1350) starts below the story's top bar.
  const TOP = 180;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const c = PODIUM_IMAGE_COLORS[isDark ? 'dark' : 'light'];

  const FONT = '"SF Pro Display", system-ui, -apple-system, sans-serif';

  const rrect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const fitText = (text: string, maxW: number, font: string): string => {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) {
      t = t.slice(0, -1);
    }
    return t + '…';
  };

  // Background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 600);
  glow.addColorStop(0, isDark ? 'rgba(255,214,10,0.06)' : 'rgba(255,214,10,0.08)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.save();
  ctx.translate(0, TOP);
  const PAD = 80;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Centred, like everything else on a story.
  ctx.font = `800 80px ${FONT}`;
  const wP = ctx.measureText('Pépite').width;
  const wC = ctx.measureText('Citron').width;
  ctx.font = `300 72px ${FONT}`;
  const wA = ctx.measureText(' & ').width;
  const x0 = (W - wP - wA - wC) / 2;

  ctx.font = `800 80px ${FONT}`;
  ctx.fillStyle = c.gold;
  ctx.fillText('Pépite', x0, 120);
  ctx.font = `300 72px ${FONT}`;
  ctx.fillStyle = c.t3;
  ctx.fillText(' & ', x0 + wP, 120);
  ctx.font = `800 80px ${FONT}`;
  ctx.fillStyle = c.lemon;
  ctx.fillText('Citron', x0 + wP + wA, 120);

  ctx.textAlign = 'center';
  ctx.font = `400 34px ${FONT}`;
  ctx.fillStyle = c.t3;
  ctx.fillText(fitText(`${matchLabel}  ·  ${matchDate}`, W - PAD * 2, `400 34px ${FONT}`), W / 2, 175);

  ctx.strokeStyle = c.sep;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 205);
  ctx.lineTo(W - PAD, 205);
  ctx.stroke();

  // Pépite label
  ctx.textAlign = 'center';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = c.gold;
  ctx.fillText(t('podiumImage.pepites'), W / 2, 265);

  // Podium — BOTTOM is pushed to 900 to leave room for avatar circles above names
  const BOTTOM = 900;
  const BAR_W  = 230;
  const SLOT_GAP = 18;

  const slots = [
    { rank: 2, player: pepiteRanked[1], barH: 190, x: W / 2 - BAR_W * 1.5 - SLOT_GAP },
    { rank: 1, player: pepiteRanked[0], barH: 310, x: W / 2 - BAR_W / 2 },
    { rank: 3, player: pepiteRanked[2], barH: 140, x: W / 2 + BAR_W / 2 + SLOT_GAP },
  ] as const;

  slots.forEach(({ rank, player, barH, x }) => {
    if (!player) return;
    // The step follows the position; the rank shown, the crown and the gold
    // follow the score, so ex-aequo winners all read "1" with a crown.
    const shownRank = player.rank ?? rank;
    const isFirst  = shownRank === 1;
    const barColor = isFirst ? c.goldFill : c.step;
    const barTop   = BOTTOM - barH;
    const cx       = x + BAR_W / 2;

    rrect(x, barTop, BAR_W, barH, 12);
    ctx.fillStyle = barColor;
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${isFirst ? 60 : 48}px ${FONT}`;
    ctx.fillStyle = isFirst ? '#000' : c.stepText;
    ctx.fillText(String(shownRank), cx, barTop + barH / 2 + 4);

    // Name, then points, then the step: nothing overlaps the bar.
    const nameY       = barTop - 58;
    const nameFontSz  = isFirst ? 44 : 36;
    const nameFont    = `${isFirst ? 700 : 600} ${nameFontSz}px ${FONT}`;
    const displayedName = player.nickname?.trim() || player.name;
    const name        = fitText(displayedName, BAR_W - 10, nameFont);

    // Avatar circle — centered above the name with an 8px gap
    const avatarR  = isFirst ? 42 : 33;
    const avatarCY = nameY - nameFontSz - 8 - avatarR;
    // The crown sits on the winner's head, clear of the step.
    if (isFirst) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `52px serif`;
      ctx.fillText('👑', cx, avatarCY - avatarR - 30);
    }
    // A picked emoji / colour wins; else the image keeps its own brighter
    // initials colours.
    const look = playerAvatar(player);
    ctx.beginPath();
    ctx.arc(cx, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = isAvatarColor(player.avatar_color) ? look.background : seedHSL(player.name);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (look.isEmoji) {
      ctx.font = `${Math.round(avatarR * 1.1)}px serif`;
      ctx.fillText(look.label, cx, avatarCY + 3);
    } else {
      ctx.font = `800 ${Math.round(avatarR * 0.75)}px ${FONT}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(playerInitials(displayedName), cx, avatarCY + 2);
    }

    ctx.font = nameFont;
    ctx.fillStyle = isFirst ? c.gold : c.t1;
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, cx, nameY);

    ctx.font = `400 28px ${FONT}`;
    ctx.fillStyle = c.t3;
    ctx.fillText(t('vote.pts', { count: player.pts }), cx, nameY + 34);
  });

  // Citron section
  const CITRON_Y = BOTTOM + 50;

  rrect(PAD, CITRON_Y, W - PAD * 2, 120, 20);
  ctx.fillStyle = c.lemonBox;
  ctx.fill();
  ctx.strokeStyle = c.lemonEdge;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Every ex-aequo citron while the tie is open — never an arbitrary one.
  const lemonWinners = lemonRanked.some(p => p.rank != null)
    ? lemonRanked.filter(p => p.rank === 1)
    : lemonRanked.slice(0, 1);
  const lemonWinner = lemonWinners[0];
  if (lemonWinner) {
    // The Citron himself rather than an emoji (colour emoji fonts vary).
    if (citronFace) ctx.drawImage(citronFace, PAD + 18, CITRON_Y + 15, 90, 90);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillStyle = c.t2;
    ctx.fillText(t(lemonWinners.length > 1 ? 'podiumImage.citronsTie' : 'podiumImage.citron'), PAD + 112, CITRON_Y + 38);

    const lName = fitText(
      lemonWinners.length > 1
        ? lemonWinners.map(p => p.nickname?.trim() || p.name).join(' & ')
        : (lemonWinner.nickname?.trim() || lemonWinner.name) + (lemonWinner.absent ? ' (absent)' : ''),
      W - PAD * 2 - 200,
      `700 40px ${FONT}`,
    );
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = c.lemon;
    ctx.fillText(lName, PAD + 112, CITRON_Y + 84);

    ctx.textAlign = 'right';
    ctx.font = `700 34px ${FONT}`;
    ctx.fillStyle = c.lemon;
    ctx.fillText(t('vote.pts', { count: lemonWinner.pts }), W - PAD - 32, CITRON_Y + 62);
  }

  ctx.restore();

  // Pépite and Citron comment the night: Citron speaks from the left, Pépite
  // from the right, as in the app.
  const wrap = (text: string, maxW: number): string[] => {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const FACE = 150, LINE_H = 44, BUBBLE_PAD = 26, GAP = 36;
  const bubbleW = W - PAD * 2 - FACE - 24;
  ctx.font = `500 34px ${FONT}`;
  const bubbles = (mascotLine ?? []).slice(0, 2).map(b => {
    const lines = wrap(b.text, bubbleW - BUBBLE_PAD * 2).slice(0, 4);
    return { b, lines, h: lines.length * LINE_H + BUBBLE_PAD * 2 - 8 };
  });
  // Centred between the Citron box and the footer.
  const areaTop = TOP + BOTTOM + 50 + 120 + 40, areaBottom = H - TOP - 110;
  const blockH = bubbles.reduce((sum, x) => sum + Math.max(x.h, FACE), 0) + GAP * Math.max(0, bubbles.length - 1);
  let y = areaTop + Math.max(0, (areaBottom - areaTop - blockH) / 2);
  bubbles.forEach(({ b, lines, h: bubbleH }, i) => {
    const right = b.who === 'pepite';
    const faceX = right ? W - PAD - FACE : PAD;
    const bubbleX = right ? PAD : PAD + FACE + 24;
    ctx.font = `500 34px ${FONT}`;
    rrect(bubbleX, y, bubbleW, bubbleH, 28);
    ctx.fillStyle = c.bubble;
    ctx.fill();
    ctx.fillStyle = c.t1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, k) => ctx.fillText(l, bubbleX + BUBBLE_PAD, y + BUBBLE_PAD + k * LINE_H));
    const img = mascotImages[i];
    if (img) ctx.drawImage(img, faceX, y + bubbleH - FACE + 20, FACE, FACE);
    y += Math.max(bubbleH, FACE) + GAP;
  });

  // Footer — the image travels through team chats: say where it comes from.
  const FOOT = H - TOP;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillStyle = c.gold;
  ctx.fillText(INSTAGRAM_HANDLE ? `pepite-citron.com  ·  @${INSTAGRAM_HANDLE}` : 'pepite-citron.com', W / 2, FOOT - 40);
  ctx.font = `400 26px ${FONT}`;
  ctx.fillStyle = c.t3;
  ctx.fillText(t('podiumImage.tagline'), W / 2, FOOT);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image blob'));
    }, 'image/png');
  });
}
