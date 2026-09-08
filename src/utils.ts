import type { Vote, Player, ScoreMap, Scores } from '@/types';

/**
 * Points attribués à chaque rang de Pépite (index 0 = 1er choix), par mode.
 * Source unique partagée entre le calcul des scores et l'affichage du
 * dépouillement (ResultsView) pour qu'ils ne divergent jamais.
 */
export const PEPITE_POINTS: Record<2 | 3, readonly number[]> = {
  2: [2, 1],
  3: [3, 2, 1],
};

/**
 * Calcule les scores Pépite et Citron.
 *
 * @param votes          - tous les votes du match
 * @param presentPlayers - joueurs présents ce soir (éligibles Pépite)
 * @param allPlayers     - toute l'équipe (éligibles Citron même si absents)
 *                         Si omis, seuls les présents sont pris en compte.
 */
export function computeScores(votes: Vote[], presentPlayers: Player[], allPlayers?: Player[], pepiteCount: 2 | 3 = 2): Scores {
  const everyone = allPlayers || presentPlayers;
  const best: ScoreMap = {};
  const lemon: ScoreMap = {};

  presentPlayers.forEach(p => { best[p.id]  = { pts: 0, comments: [] }; });
  everyone.forEach(p =>       { lemon[p.id] = { pts: 0, comments: [] }; });

  const pts = PEPITE_POINTS[pepiteCount];

  votes.forEach(v => {
    if (v.best1_id != null && best[v.best1_id]) {
      best[v.best1_id].pts += pts[0];
      if (v.best1_comment) best[v.best1_id].comments.push(v.best1_comment);
    }
    if (v.best2_id != null && best[v.best2_id]) {
      best[v.best2_id].pts += pts[1];
      if (v.best2_comment) best[v.best2_id].comments.push(v.best2_comment);
    }
    if (pepiteCount === 3 && v.best3_id != null && best[v.best3_id]) {
      best[v.best3_id].pts += pts[2];
      if (v.best3_comment) best[v.best3_id].comments.push(v.best3_comment);
    }
    if (v.lemon_id  != null && lemon[v.lemon_id]) {
      lemon[v.lemon_id].pts += 1;
      if (v.lemon_comment)  lemon[v.lemon_id].comments.push(v.lemon_comment);
    }
  });

  return { best, lemon };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}
