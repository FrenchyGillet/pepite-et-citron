import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DEMO_MODE } from '@/api';
import { queryKeys, scope } from './queries';
import { useAppStore } from '@/store/appStore';
import type { EntityId, Vote, Match, Player, ManualMatchInput, MatchScheduleInput, OrgRole } from '@/types';

export function useSubmitVote(matchId: EntityId | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vote: Vote) => api.submitVote(vote),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.votes(matchId) }),
  });
}

/** Adds the signed-in user to a team as a voter, then reloads their teams. */
export function useJoinOrg() {
  const loadOrgs = useAppStore(s => s.loadOrgs);
  return useMutation({
    mutationFn: async (orgId: string) => {
      await api.selfJoinOrg(orgId);
      await loadOrgs();
    },
  });
}

export function useDeleteVote(matchId: EntityId | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (voteId: EntityId) => api.deleteVote(voteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.votes(matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.voteCount(matchId) });
    },
  });
}

export function useAddPlayer(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.addPlayer(scope(orgId), name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(orgId) }),
  });
}

export function useAddPlayers(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (names: string[]) => api.addPlayers(scope(orgId), names),
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

export function useSetPlayerArchived(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: EntityId; archived: boolean }) => api.setPlayerArchived(id, archived),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(orgId) }),
  });
}

export function useUpdatePlayer(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: EntityId; data: Partial<Pick<Player, 'nickname' | 'avatar_url' | 'avatar_emoji' | 'avatar_color'>> }) =>
      api.updatePlayer(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(orgId) }),
  });
}

export function useLinkPlayer(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: EntityId) => api.linkPlayer(playerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players(orgId) }),
  });
}

export function useCreateMatch(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ label, presentIds, teamId, season, pepiteCount, voteDeadline }: {
      label: string; presentIds: EntityId[]; teamId: EntityId | null; season: number; pepiteCount?: 2 | 3;
      voteDeadline?: string | null;
    }) => api.createMatch(scope(orgId), label, presentIds, teamId, season, pepiteCount, voteDeadline),
    onSuccess: (_match, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) });
      // Fire-and-forget email + push notifications — failures are silently ignored
      if (orgId) {
        void sendMatchNotification(orgId, vars.label);
        void sendPushNotification(orgId, 'vote_open', vars.label);
      }
    },
  });
}

/** Schedules a match (20260021); the delay is saved first when asked. */
export function useCreateSchedule(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, delayMinutes }: { input: MatchScheduleInput; delayMinutes?: number }) => {
      if (delayMinutes != null) await api.setVoteOpenDelay(scope(orgId), delayMinutes);
      await api.createSchedule(scope(orgId), input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.schedules(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.voteOpenDelay(orgId) });
    },
  });
}

/** « Ouvrir maintenant »: the match ended early. Members are told as usual. */
export function useOpenScheduleNow(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => api.openScheduleNow(id),
    onSuccess: (match) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.schedules(orgId) });
      if (orgId) {
        void sendMatchNotification(orgId, match.label);
        void sendPushNotification(orgId, 'vote_open', match.label);
      }
    },
  });
}

export function useDeleteSchedule(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: EntityId) => api.deleteSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schedules(orgId) }),
  });
}

export function useSetVoteOpenDelay(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (minutes: number) => api.setVoteOpenDelay(scope(orgId), minutes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.voteOpenDelay(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.schedules(orgId) });
    },
  });
}

/** A match played without a vote, entered from the history: no notification. */
export function useCreateManualMatch(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualMatchInput) => api.createManualMatch(scope(orgId), input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.matches(orgId) }),
  });
}

/** Number of devices notified, or null when the push could not be sent. */
async function sendPushNotification(
  orgId: string,
  type: 'vote_open' | 'results_ready' | 'vote_reminder',
  matchLabel: string,
  matchId?: EntityId,
): Promise<number | null> {
  try {
    const { postToApi } = await import('@/lib/serverApi');
    const res = await postToApi('/api/send-push-notification',
      { orgId, type, matchLabel, ...(matchId != null ? { matchId: String(matchId) } : {}) });
    if (!res.ok) return null;
    const body = await res.json() as { sent?: number };
    return body.sent ?? null;
  } catch {
    // Best-effort — never throw
    return null;
  }
}

/** Turn the "vote ouvert" emails of a team on or off for the caller (F10). */
export function useSetEmailNotifications(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => api.setEmailNotifications(orgId!, enabled),
    onSuccess: (_data, enabled) => qc.setQueryData(queryKeys.emailNotifications(orgId), enabled),
  });
}

/** Push "il manque ton vote" to present players who have not voted (F1). */
export function useSendVoteReminder(orgId?: string | null) {
  return useMutation({
    mutationFn: ({ matchId, matchLabel }: { matchId: EntityId; matchLabel: string }) =>
      orgId ? sendPushNotification(orgId, 'vote_reminder', matchLabel, matchId) : Promise.resolve(null),
  });
}

/**
 * Welcome email to the organiser once /start has created their team (vote
 * link, how to reveal, app link). Best effort: never blocks or throws.
 */
export async function sendWelcomeEmail(orgId: string): Promise<void> {
  if (DEMO_MODE) return;
  try {
    const { postToApi } = await import('@/lib/serverApi');
    await postToApi('/api/send-welcome-email', { orgId });
  } catch {
    // Best-effort — never throw
  }
}

async function sendMatchNotification(orgId: string, matchLabel: string): Promise<void> {
  try {
    const { postToApi } = await import('@/lib/serverApi');
    await postToApi('/api/send-match-notification', { orgId, matchLabel });
  } catch {
    // Best-effort — never throw
  }
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

export function useStartCounting(orgId?: string | null, matchLabel?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, order }: { id: EntityId; order: EntityId[] }) =>
      api.startCounting(id, order),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatch(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.votes(vars.id) });
      // Fire-and-forget push notification — failure is silently ignored
      if (orgId && matchLabel) void sendPushNotification(orgId, 'results_ready', matchLabel);
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
      api.createTeam(scope(orgId), name, playerIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teams(orgId) }),
  });
}

export function useUpdateTeam(orgId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, playerIds }: { id: EntityId; playerIds: EntityId[] }) =>
      api.updateTeam(id, playerIds),
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

export function useCreateGuestToken(orgId: string | null | undefined, matchId: EntityId | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, id }: { name: string; id: EntityId }) =>
      api.createGuestToken(scope(orgId), name, id),
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
    mutationFn: ({ email, role }: { email: string; role?: OrgRole }) =>
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
    mutationFn: () => api.advanceSeason(scope(orgId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.currentSeason(orgId) }),
  });
}

export function useSetSeasonName(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ season, name }: { season: number; name: string }) =>
      api.setSeasonName(scope(orgId), season, name),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: queryKeys.seasonName(orgId, vars.season) }),
  });
}
