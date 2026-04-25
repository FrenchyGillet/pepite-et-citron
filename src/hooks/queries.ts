import { useQuery, useQueries } from '@tanstack/react-query';
import { api, DEMO_MODE } from '@/api';
import type { EntityId } from '@/types';

export const queryKeys = {
  players:       (orgId?: string | null)               => ['players',       orgId]    as const,
  activeMatch:   (orgId?: string | null)               => ['activeMatch',   orgId]    as const,
  matchById:     (id: EntityId | null | undefined)     => ['match',         id]       as const,
  votes:         (matchId: EntityId | null | undefined) => ['votes',        matchId]  as const,
  allVotes:      (orgId?: string | null)               => ['allVotes',      orgId]    as const,
  matches:       (orgId?: string | null)               => ['matches',       orgId]    as const,
  teams:         (orgId?: string | null)               => ['teams',         orgId]    as const,
  guestTokens:   (matchId: EntityId | null | undefined) => ['guestTokens', matchId]  as const,
  currentSeason: (orgId?: string | null)               => ['currentSeason', orgId]    as const,
  seasonName:    (season: number)                      => ['seasonName',    season]   as const,
  orgMembers:    (orgId: string | null | undefined)    => ['orgMembers',    orgId]    as const,
} as const;

const orgEnabled = (orgId?: string | null) => DEMO_MODE || !!orgId;

export function usePlayers(orgId?: string | null) {
  return useQuery({
    queryKey: queryKeys.players(orgId),
    queryFn: () => api.getPlayers(),
    enabled: orgEnabled(orgId),
    staleTime: 30_000,
  });
}

export function useActiveMatch(orgId?: string | null) {
  return useQuery({
    queryKey: queryKeys.activeMatch(orgId),
    queryFn: () => api.getActiveMatch(),
    enabled: orgEnabled(orgId),
    refetchInterval: (query) => {
      const match = query.state.data;
      return (match?.is_open || match?.phase === 'counting') ? 5_000 : false;
    },
  });
}

export function useMatchById(id: EntityId | null | undefined) {
  return useQuery({
    queryKey: queryKeys.matchById(id),
    queryFn: () => api.getMatchById(id!),
    enabled: id != null,
    staleTime: 10_000,
  });
}

export function useVotes(matchId: EntityId | null | undefined) {
  return useQuery({
    queryKey: queryKeys.votes(matchId),
    queryFn: () => api.getVotes(matchId!),
    enabled: matchId != null,
    refetchInterval: 5_000,
  });
}

export function useAllVotes(orgId?: string | null) {
  return useQuery({
    queryKey: queryKeys.allVotes(orgId),
    queryFn: () => api.getAllVotes(),
    enabled: orgEnabled(orgId),
  });
}

export function useMatches(orgId?: string | null) {
  return useQuery({
    queryKey: queryKeys.matches(orgId),
    queryFn: () => api.getMatches(),
    enabled: orgEnabled(orgId),
  });
}

export function useTeams(orgId?: string | null) {
  return useQuery({
    queryKey: queryKeys.teams(orgId),
    queryFn: () => api.getTeams(),
    enabled: orgEnabled(orgId),
    staleTime: 30_000,
  });
}

export function useGuestTokens(matchId: EntityId | null | undefined) {
  return useQuery({
    queryKey: queryKeys.guestTokens(matchId),
    queryFn: () => api.getGuestTokens(matchId!),
    enabled: matchId != null,
  });
}

export function useCurrentSeason(orgId?: string | null) {
  return useQuery({
    queryKey: queryKeys.currentSeason(orgId),
    queryFn: () => api.getCurrentSeason(),
    enabled: orgEnabled(orgId),
    staleTime: 60_000,
  });
}

export function useOrgMembers(orgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.orgMembers(orgId),
    queryFn: () => api.getOrgMembers(orgId!),
    enabled: !!orgId && !DEMO_MODE,
  });
}

export function useSeasonNames(seasons: number[]) {
  const results = useQueries({
    queries: seasons.map(s => ({
      queryKey: queryKeys.seasonName(s),
      queryFn: () => api.getSeasonName(s),
      staleTime: 60_000,
    })),
  });
  return Object.fromEntries(
    seasons.map((s, i) => [s, results[i]?.data ?? null])
  ) as Record<number, string | null>;
}
