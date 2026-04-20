import { computeScores } from '../utils.js';

export function Scoreboard({ votes, present, tiebreakers = {}, showLemons = true }) {
  const { best, lemon } = computeScores(votes, present);

  const withRanks = (arr) => {
    let rank = 1;
    return arr.map((p, i) => { if (i > 0 && p.pts < arr[i - 1].pts) rank = i + 1; return { ...p, rank }; });
  };

  const bestRanked = withRanks(
    present.map(p => ({ ...p, pts: best[p.id]?.pts || 0, comments: best[p.id]?.comments || [] }))
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : tiebreakers.best_id === a.id ? -1 : tiebreakers.best_id === b.id ? 1 : 0)
  );
  const lemonRanked = withRanks(
    present.map(p => ({ ...p, pts: lemon[p.id]?.pts || 0, comments: lemon[p.id]?.comments || [] }))
      .filter(p => p.pts > 0)
      .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : tiebreakers.lemon_id === a.id ? -1 : tiebreakers.lemon_id === b.id ? 1 : 0)
  );
  const maxBest  = bestRanked[0]?.pts || 1;
  const maxLemon = lemonRanked[0]?.pts || 1;

  return (
    <>
      <p className="section-label mb-4">Pépites</p>
      <div className="group">
        {bestRanked.length === 0
          ? <div className="row"><span style={{ color: "var(--label3)", fontSize: 14 }}>Aucun vote révélé…</span></div>
          : bestRanked.map((p) => {
            const isBeer = tiebreakers.best_id === p.id;
            const isFirst = p.rank === 1;
            return (
              <div key={p.id}>
                <div className="row">
                  <div style={{ width: 24, fontWeight: 700, fontSize: isBeer ? 16 : 13, flexShrink: 0, color: isFirst ? "var(--gold)" : "var(--label3)" }}>
                    {isBeer ? "🍺" : p.rank}
                  </div>
                  <div className="row-body"><div className="row-title">{p.name}</div></div>
                  <div className="score-bar-wrap">
                    <div className="score-bar" style={{ width: `${(p.pts / maxBest) * 100}%`, background: isFirst ? "var(--gold)" : "var(--label3)" }} />
                  </div>
                  <div className="row-value gold" style={{ minWidth: 28, textAlign: "right" }}>{p.pts}</div>
                </div>
                {p.comments.map((c, j) => <div key={j} className="comment">"{c}"</div>)}
              </div>
            );
          })
        }
      </div>
      {showLemons && lemonRanked.length > 0 && (
        <>
          <p className="section-label mb-4" style={{ color: "var(--lemon)" }}>Citrons</p>
          <div className="group">
            {lemonRanked.map((p) => {
              const isBeer = tiebreakers.lemon_id === p.id;
              return (
                <div key={p.id}>
                  <div className="row">
                    <div className="row-icon lemon">{isBeer ? "🍺" : "🍋"}</div>
                    <div className="row-body"><div className="row-title">{p.name}</div></div>
                    <div className="score-bar-wrap">
                      <div className="score-bar" style={{ width: `${(p.pts / maxLemon) * 100}%`, background: "var(--lemon)" }} />
                    </div>
                    <div className="row-value lemon" style={{ minWidth: 28, textAlign: "right" }}>{p.pts}</div>
                  </div>
                  {p.comments.map((c, j) => <div key={j} className="comment">"{c}"</div>)}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
