import { useState } from 'react';
import { computeScores } from '../utils.js';

export function PodiumView({ votes, present, allPlayers, tiebreakers = {}, pepitesCount = 2 }) {
  const [podiumTab, setPodiumTab] = useState("pepite");
  const { best, lemon } = computeScores(votes, present, allPlayers, pepitesCount);
  const everyone    = allPlayers || present;
  const presentIds  = new Set(present.map(p => p.id));

  const buildRanked = (scores, tieKey, pool) =>
    pool
      .map(p => ({ ...p, pts: scores[p.id]?.pts || 0, comments: scores[p.id]?.comments || [], absent: !presentIds.has(p.id) }))
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : tiebreakers[tieKey] === a.id ? -1 : tiebreakers[tieKey] === b.id ? 1 : 0);

  const isPepite = podiumTab === "pepite";
  const ranked   = isPepite ? buildRanked(best, "best_id", present) : buildRanked(lemon, "lemon_id", everyone);
  const color    = isPepite ? "var(--gold)"  : "var(--lemon)";
  const colorDim = isPepite ? "var(--gold-dim)" : "var(--lemon-dim)";

  const [first, second, third] = ranked;

  const Slot = ({ player, place, height }) => {
    const isFirst = place === 1;
    const nameColor = isFirst ? color : place === 2 ? "var(--label2)" : "var(--label3)";
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {player ? (
          <>
            {isFirst && <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 5 }}>👑</div>}
            <div style={{ fontSize: isFirst ? 15 : 13, fontWeight: 700, color: nameColor, textAlign: "center", lineHeight: 1.2, marginBottom: 2, padding: "0 4px" }}>{player.name}</div>
            {player.absent && <div style={{ fontSize: 10, color: "var(--label4)", marginBottom: 2, fontStyle: "italic" }}>absent</div>}
            <div style={{ fontSize: 12, color: "var(--label3)", marginBottom: 8 }}>{player.pts} pt{player.pts > 1 ? "s" : ""}</div>
          </>
        ) : (
          <div style={{ height: 56 }} />
        )}
        <div style={{
          height, width: "100%", borderRadius: "8px 8px 0 0",
          background: isFirst ? colorDim : "var(--bg3)",
          border: isFirst ? `1px solid ${color}` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: isFirst ? 28 : 20, fontWeight: 800, color: isFirst ? color : "var(--label4)" }}>{place}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Tab switcher */}
      <div style={{ display: "flex", background: "var(--bg2)", borderRadius: "var(--radius-lg)", padding: 4, marginBottom: 20 }}>
        {[{ id: "pepite", label: "⭐  Pépites" }, { id: "citron", label: "🍋  Citrons" }].map(({ id, label }) => (
          <button key={id} onClick={() => setPodiumTab(id)} style={{
            flex: 1, padding: "10px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: podiumTab === id ? "var(--bg3)" : "transparent",
            color: podiumTab === id ? "var(--label)" : "var(--label3)",
            border: "none", cursor: "pointer", transition: "all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="group" style={{ marginBottom: 16 }}>
          <div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun vote.</span></div>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <Slot player={second} place={2} height={80} />
            <Slot player={first}  place={1} height={112} />
            <Slot player={third}  place={3} height={56} />
          </div>
          <div style={{ height: 4, background: "var(--bg3)", borderRadius: "0 0 8px 8px", marginBottom: 24 }} />

          {/* Winner comments */}
          {first?.comments?.length > 0 && (
            <>
              <p className="section-label mb-4">Commentaires sur {first.name}</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {first.comments.map((c, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
                    <div style={{ fontSize: 13, color: "var(--label2)", fontStyle: "italic", lineHeight: 1.5 }}>"{c}"</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 4th+ */}
          {ranked.length > 3 && (
            <>
              <p className="section-label mb-4">Suite du classement</p>
              <div className="group" style={{ marginBottom: 16 }}>
                {ranked.slice(3).map((p, i) => (
                  <div key={p.id} className="row">
                    <div style={{ width: 24, fontWeight: 700, fontSize: 13, flexShrink: 0, color: "var(--label3)" }}>{i + 4}</div>
                    <div className="row-body"><div className="row-title">{p.name}</div></div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: `${(p.pts / (ranked[0]?.pts || 1)) * 100}%`, background: "var(--label3)" }} />
                      </div>
                      <div className="row-value" style={{ color: "var(--label3)", minWidth: 24, textAlign: "right" }}>{p.pts}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
