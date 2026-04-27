/**
 * GET /api/og
 *
 * Generates the Open Graph preview image (1200×630) using Vercel OG (Satori).
 * Runs on the Edge Runtime — no cold-start delay.
 *
 * Usage in HTML:
 *   <meta property="og:image" content="https://pepite-citron.com/api/og" />
 */
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          width:          '100%',
          height:         '100%',
          background:     '#000',
          fontFamily:     'system-ui, -apple-system, sans-serif',
          padding:        '0 80px',
        }}
      >
        {/* ── Subtle radial glow behind the title ── */}
        <div style={{
          display:      'flex',
          position:     'absolute',
          top:          '50%',
          left:         '50%',
          width:        900,
          height:       500,
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, rgba(255,214,10,0.07) 0%, transparent 70%)',
          transform:    'translate(-50%, -52%)',
        }} />

        {/* ── Badges ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          {[
            { emoji: '⭐', label: 'Pépite', color: '#FFD700', bg: 'rgba(255,214,10,0.12)', border: 'rgba(255,214,10,0.25)' },
            { emoji: '🍋', label: 'Citron', color: '#32D74B', bg: 'rgba(50,215,75,0.12)',  border: 'rgba(50,215,75,0.25)'  },
          ].map(b => (
            <div key={b.label} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              background:   b.bg,
              border:       `1px solid ${b.border}`,
              borderRadius: 100,
              padding:      '10px 22px',
              fontSize:     20,
              color:        b.color,
              fontWeight:   700,
              letterSpacing: '0.02em',
            }}>
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>

        {/* ── Main title ── */}
        <div style={{
          display:        'flex',
          alignItems:     'baseline',
          gap:            0,
          fontSize:       104,
          fontWeight:     900,
          letterSpacing:  '-4px',
          lineHeight:     1,
          marginBottom:   28,
        }}>
          <span style={{ color: '#FFD700' }}>Pépite</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 20px', fontWeight: 300 }}>&</span>
          <span style={{ color: '#32D74B' }}>Citron</span>
        </div>

        {/* ── Tagline ── */}
        <div style={{
          display:        'flex',
          fontSize:       28,
          color:          'rgba(235,235,245,0.45)',
          fontWeight:     400,
          textAlign:      'center',
          lineHeight:     1.5,
          maxWidth:       700,
          letterSpacing:  '-0.3px',
        }}>
          Votez le meilleur et le moins bon joueur après chaque match
        </div>

        {/* ── Separator ── */}
        <div style={{
          display:      'flex',
          width:        60,
          height:       2,
          background:   'rgba(255,255,255,0.1)',
          borderRadius: 1,
          margin:       '36px 0 24px',
        }} />

        {/* ── Feature pills ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          {['Vote anonyme', 'Résultats en direct', 'Stats de saison'].map(f => (
            <div key={f} style={{
              display:      'flex',
              background:   'rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding:      '8px 16px',
              fontSize:     16,
              color:        'rgba(235,235,245,0.4)',
              fontWeight:   500,
            }}>{f}</div>
          ))}
        </div>

        {/* ── URL watermark ── */}
        <div style={{
          display:       'flex',
          position:      'absolute',
          bottom:        36,
          fontSize:      17,
          color:         'rgba(255,255,255,0.18)',
          letterSpacing: '0.08em',
          fontWeight:    500,
        }}>
          pepite-citron.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
