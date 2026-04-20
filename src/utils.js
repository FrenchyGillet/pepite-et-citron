export function computeScores(votes, players) {
  const best = {}, lemon = {};
  players.forEach(p => { best[p.id] = { pts: 0, comments: [] }; lemon[p.id] = { pts: 0, comments: [] }; });
  votes.forEach(v => {
    if (v.best1_id  && best[v.best1_id])  { best[v.best1_id].pts  += 2; if (v.best1_comment)  best[v.best1_id].comments.push(v.best1_comment); }
    if (v.best2_id  && best[v.best2_id])  { best[v.best2_id].pts  += 1; if (v.best2_comment)  best[v.best2_id].comments.push(v.best2_comment); }
    if (v.lemon_id  && lemon[v.lemon_id]) { lemon[v.lemon_id].pts += 1; if (v.lemon_comment) lemon[v.lemon_id].comments.push(v.lemon_comment); }
  });
  return { best, lemon };
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}
