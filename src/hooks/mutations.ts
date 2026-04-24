import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from './queries';
import type { EntityId, Vote, Match } from '../types';

export function useSubmitVote(matchId: EntityId | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vote: Vote) => api.submitVote(vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.votes(matchId) }),
  });
}

export function useAddPlayer(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.addPlayer(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(orgId) }),
  });
}

export function useRemovePlayer(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => api.removePlayer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(orgId) }),
  });
}

export function useCreateMatch(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ label, presentIds, teamId, season }: {
      label: string; presentIds: EntityId[]; teamId: EntityId | null; season: number;
    }) => api.createMatch(label, presentIds, teamId, season),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) }),
  });
}

export function useCloseMatch(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => api.closeMatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.matches(orgId) });
    },
  });
}

export function useStartCounting(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, order }: { id: EntityId; order: EntityId[] }) =>
      api.startCounting(id, order),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.votes(vars.id) });
    },
  });
}

export function useRevealNext(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, count }: { id: EntityId; count: number }) =>
      api.revealNext(id, count),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) }),
  });
}

export function useUpdateMatch(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: EntityId; data: Partial<Match> }) =>
      api.updateMatch(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.matchById(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.matches(orgId) });
    },
  });
}

export function useDeleteMatch(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => api.deleteMatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.allVotes(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.matches(orgId) });
    },
  });
}

export function useCreateTeam(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, playerIds }: { name: string; playerIds: EntityId[] }) =>
      api.createTeam(name, playerIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teams(orgId) }),
  });
}

export function useDeleteTeam(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => api.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teams(orgId) }),
  });
}

export function useCreateGuestToken(matchId: EntityId | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, id }: { name: string; id: EntityId }) =>
      api.createGuestToken(name, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.guestTokens(matchId) }),
  });
}

export function useDeleteGuestToken(matchId: EntityId | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => api.deleteGuestToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.guestTokens(matchId) }),
  });
}

export function useAddMember(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role?: 'admin' | 'voter' }) =>
      api.addMember(email, orgId!, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orgMembers(orgId) }),
  });
}

export function useRemoveMember(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeMember(userId, orgId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orgMembers(orgId) }),
  });
}

export function useAdvanceSeason(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.advanceSeason(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.currentSeason(orgId) }),
  });
}

export function useSetSeasonName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ season, name }: { season: number; name: string }) =>
      api.setSeasonName(season, name),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: queryKeys.seasonName(vars.season) }),
  });
}
