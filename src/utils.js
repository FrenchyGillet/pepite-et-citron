/**
 * Calcule les scores Pépite et Citron.
 *
 * @param votes          - tous les votes du match
 * @param presentPlayers - joueurs présents ce soir (éligibles Pépite et Citron)
 * @param allPlayers     - toute l'équipe (éligibles Citron même si absents)
 *                         Si omis, seuls les présents sont pris en compte.
 * @param pepitesCount   - nombre de Pépites votées (2 ou 3, défaut 2)
 */
export function computeScores(votes, presentPlayers, allPlayers, pepitesCount = 2) {
  const everyone = allPlayers || presentPlayers;
  const best = {}, lemon = {};
  presentPlayers.forEach(p => { best[p.id]  = { pts: 0, comments: [] }; });
  everyone.forEach(p =>      { lemon[p.id] = { pts: 0, comments: [] }; });
  const pts1 = pepitesCount === 3 ? 3 : 2;
  const pts2 = pepitesCount === 3 ? 2 : 1;
  votes.forEach(v => {
    if (v.best1_id  && best[v.best1_id])  { best[v.best1_id].pts  += pts1; if (v.best1_comment)  best[v.best1_id].comments.push(v.best1_comment); }
    if (v.best2_id  && best[v.best2_id])  { best[v.best2_id].pts  += pts2; if (v.best2_comment)  best[v.best2_id].comments.push(v.best2_comment); }
    if (pepitesCount === 3 && v.best3_id && best[v.best3_id]) { best[v.best3_id].pts += 1; if (v.best3_comment) best[v.best3_id].comments.push(v.best3_comment); }
    if (v.lemon_id  && lemon[v.lemon_id]) { lemon[v.lemon_id].pts += 1; if (v.lemon_comment)  lemon[v.lemon_id].comments.push(v.lemon_comment); }
  });
  return { best, lemon };
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}
