/**
 * Génère une image PNG du podium à partir des données du match.
 * Retourne un Blob PNG prêt à partager.
 */
export async function generatePodiumImage({
  matchLabel,
  matchDate,
  pepiteRanked,   // [{ name, pts, absent? }, ...]
  lemonRanked,    // [{ name, pts, absent? }, ...]
  isDark = true,
}) {
  // ── Attendre le chargement des polices ──────────────────────────────────────
  await document.fonts.ready;

  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Palette ─────────────────────────────────────────────────────────────────
  const c = isDark
    ? { bg: '#1C1C1E', bg2: '#2C2C2E', bg3: '#3A3A3C', bg4: '#48484A',
        t1: '#FFFFFF', t2: 'rgba(235,235,245,0.8)', t3: '#8E8E93', t4: '#48484A',
        gold: '#FFD60A', goldDim: 'rgba(255,214,10,0.15)',
        lemon: '#AADD00', lemonDim: 'rgba(170,221,0,0.15)',
        sep: '#38383A' }
    : { bg: '#F2F2F7', bg2: '#FFFFFF', bg3: '#E5E5EA', bg4: '#D1D1D6',
        t1: '#000000', t2: 'rgba(60,60,67,0.6)', t3: '#8E8E93', t4: '#C7C7CC',
        gold: '#B8900A', goldDim: 'rgba(184,144,10,0.12)',
        lemon: '#5A8A00', lemonDim: 'rgba(90,138,0,0.12)',
        sep: '#C6C6C8' };

  const FONT = '"SF Pro Display", system-ui, -apple-system, sans-serif';

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const rrect = (x, y, w, h, r) => {
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

  const fitText = (text, maxW, font) => {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) {
      text = text.slice(0, -1);
    }
    return text + '…';
  };

  // ── Background ───────────────────────────────────────────────────────────────
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle top-right gold glow
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 600);
  glow.addColorStop(0, isDark ? 'rgba(255,214,10,0.06)' : 'rgba(255,214,10,0.08)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Header ───────────────────────────────────────────────────────────────────
  const PAD = 80;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // "Pépite"
  ctx.font = `800 80px ${FONT}`;
  ctx.fillStyle = c.gold;
  ctx.fillText('Pépite', PAD, 120);
  const wP = ctx.measureText('Pépite').width;

  // " & "
  ctx.font = `300 72px ${FONT}`;
  ctx.fillStyle = c.t3;
  ctx.fillText(' & ', PAD + wP, 120);
  const wA = ctx.measureText(' & ').width;

  // "Citron"
  ctx.font = `800 80px ${FONT}`;
  ctx.fillStyle = c.lemon;
  ctx.fillText('Citron', PAD + wP + wA, 120);

  // Match label + date
  ctx.font = `400 34px ${FONT}`;
  ctx.fillStyle = c.t3;
  ctx.fillText(`${matchLabel}  ·  ${matchDate}`, PAD, 175);

  // Separator
  ctx.strokeStyle = c.sep;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 205);
  ctx.lineTo(W - PAD, 205);
  ctx.stroke();

  // ── Pépite label ─────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = c.gold;
  ctx.fillText('⭐  PÉPITES DU MATCH', W / 2, 265);

  // ── Podium ───────────────────────────────────────────────────────────────────
  const BOTTOM = 830;
  const BAR_W  = 230;
  const SLOT_GAP = 18;

  // slot order on screen: [2nd | 1st | 3rd]
  const slots = [
    { rank: 2, player: pepiteRanked[1], barH: 190, x: W / 2 - BAR_W - SLOT_GAP },
    { rank: 1, player: pepiteRanked[0], barH: 310, x: W / 2 - BAR_W / 2 },
    { rank: 3, player: pepiteRanked[2], barH: 140, x: W / 2 + SLOT_GAP },
  ];

  slots.forEach(({ rank, player, barH, x }) => {
    if (!player) return;
    const isFirst  = rank === 1;
    const barColor = isFirst ? c.gold : c.bg3;
    const barTop   = BOTTOM - barH;
    const cx       = x + BAR_W / 2;

    // Bar
    rrect(x, barTop, BAR_W, barH, 12);
    ctx.fillStyle = barColor;
    ctx.fill();

    // Rank number inside bar
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${isFirst ? 60 : 48}px ${FONT}`;
    ctx.fillStyle = isFirst ? '#000' : c.t4;
    ctx.fillText(rank, cx, barTop + barH / 2 + 4);

    // Crown emoji above bar
    if (isFirst) {
      ctx.font = `52px serif`;
      ctx.fillText('👑', cx, barTop - 52);
    }

    // Player name above bar
    const nameY = isFirst ? barTop - 115 : barTop - 18;
    const nameFont = `${isFirst ? 700 : 600} ${isFirst ? 44 : 36}px ${FONT}`;
    const name = fitText(player.name, BAR_W - 10, nameFont);
    ctx.font = nameFont;
    ctx.fillStyle = isFirst ? c.gold : c.t1;
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, cx, nameY);

    // Points
    ctx.font = `400 28px ${FONT}`;
    ctx.fillStyle = c.t3;
    ctx.fillText(`${player.pts} pt${player.pts > 1 ? 's' : ''}`, cx, nameY + 34);
  });

  // ── Citron section ───────────────────────────────────────────────────────────
  const CITRON_Y = BOTTOM + 50;

  // Background pill
  rrect(PAD, CITRON_Y, W - PAD * 2, 120, 20);
  ctx.fillStyle = c.lemonDim;
  ctx.fill();
  rrect(PAD, CITRON_Y, W - PAD * 2, 120, 20);
  ctx.strokeStyle = isDark ? 'rgba(170,221,0,0.2)' : 'rgba(90,138,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const lemonWinner = lemonRanked[0];
  if (lemonWinner) {
    // Emoji
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '52px serif';
    ctx.fillText('🍋', PAD + 60, CITRON_Y + 60);

    // Label
    ctx.textAlign = 'left';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillStyle = c.t3;
    ctx.fillText('Le Citron', PAD + 112, CITRON_Y + 38);

    // Name + pts
    const lName = fitText(
      lemonWinner.name + (lemonWinner.absent ? ' (absent)' : ''),
      W - PAD * 2 - 200,
      `700 40px ${FONT}`,
    );
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = c.lemon;
    ctx.fillText(lName, PAD + 112, CITRON_Y + 84);

    // Points right-aligned
    ctx.textAlign = 'right';
    ctx.font = `700 34px ${FONT}`;
    ctx.fillStyle = c.lemon;
    ctx.fillText(`${lemonWinner.pts} pt${lemonWinner.pts > 1 ? 's' : ''}`, W - PAD, CITRON_Y + 68);
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 26px ${FONT}`;
  ctx.fillStyle = c.t4;
  ctx.fillText('Pépite & Citron  ·  Généré automatiquement', W / 2, H - 55);

  // ── Export ────────────────────────────────────────────────────────────────────
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
}
