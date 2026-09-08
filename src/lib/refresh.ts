import type { QueryClient } from '@tanstack/react-query';

/**
 * refreshCoreData — invalide (et refetch) uniquement les queries qui portent
 * l'écran de vote / résultats.
 *
 * Un `queryClient.invalidateQueries()` global attend le refetch de TOUTES les
 * queries actives, dont les plus lentes (`orgMembers` via RPC, `currentSeason`,
 * `seasonName`). Sur connexion instable, un seul retry mis en pause par
 * TanStack Query suffit à bloquer le geste pull-to-refresh indéfiniment.
 *
 * On ne rafraîchit donc que l'essentiel — le reste reste servi depuis le cache
 * et se rafraîchira via Realtime / window-focus.
 */
const CORE_QUERY_KEYS = ['activeMatch', 'votes', 'players', 'allVotes', 'matches'];

export function refreshCoreData(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => CORE_QUERY_KEYS.includes(query.queryKey[0] as string),
  });
}
