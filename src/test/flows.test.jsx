/**
 * flows.test.jsx — Integration tests for flows not covered elsewhere.
 *
 * Covers gaps identified in the diagram audit:
 *   1. JoinOrgView  — auto-join lifecycle after ?org= signup
 *   3. Vote counter — real-time count shown in VoteView + post-vote screen
 *   (2, the name-only team form, was replaced by /start: quickStart.test.jsx)
 *
 * NOTE: The ?org=slug voter flow (anonymous, no account) is gated by
 * `!DEMO_MODE` in useGuest and App.tsx, so it cannot be tested end-to-end
 * through renderApp (DEMO_MODE=true). Its components are tested in isolation
 * below, and the GuestPromoView org-specific UI is covered in components.test.jsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { JoinOrgView }   from '@/components/JoinOrgView';
import { __resetDemoState, __demoAPI } from '@/App';
import { useAppStore }   from '@/store/appStore';
import { renderApp }     from './renderApp';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

/** Wraps ui with QueryClient + MemoryRouter. */
function withProviders(ui) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  __resetDemoState();
});

// ── 1. JoinOrgView ─────────────────────────────────────────────────────────────

describe('JoinOrgView', () => {
  it('shows spinner with team name while joining', () => {
    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));
    expect(screen.getByText(/Connexion à l'équipe…/i)).toBeInTheDocument();
    expect(screen.getByText(/Liaison de ton compte à Les Lions/i)).toBeInTheDocument();
  });

  it('shows success message with org name after join', async () => {
    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));
    expect(await screen.findByText(/Bienvenue dans Les Lions/i)).toBeInTheDocument();
  });

  it('clears pendingOrgId from store after successful join', async () => {
    useAppStore.setState({ pendingOrgId: 'org-1', pendingOrgName: 'Les Lions' });
    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));

    await waitFor(() => {
      expect(useAppStore.getState().pendingOrgId).toBeNull();
    });
  });

  it('shows graceful fallback when selfJoinOrg fails', async () => {
    vi.spyOn(__demoAPI, 'selfJoinOrg').mockRejectedValueOnce(new Error('RLS violation'));

    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));

    expect(await screen.findByText(/Demande à ton capitaine/i)).toBeInTheDocument();
    expect(screen.getByText(/Les Lions/i)).toBeInTheDocument();
  });

  // U9: the error screen used to be unreachable (pendingOrgId was cleared at
  // once, so App unmounted it) — it now waits for the voter's choice.
  it('keeps the error screen until the voter chooses to continue without the team', async () => {
    useAppStore.setState({ pendingOrgId: 'org-1' });
    vi.spyOn(__demoAPI, 'selfJoinOrg').mockRejectedValueOnce(new Error('RLS'));
    const user = userEvent.setup();

    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));

    await user.click(await screen.findByRole('button', { name: 'Continuer sans équipe' }));
    expect(useAppStore.getState().pendingOrgId).toBeNull();
  });

  it('"Réessayer" retries the join', async () => {
    useAppStore.setState({ pendingOrgId: 'org-1' });
    // spyOn returns the spy earlier tests created: start from a clean count.
    const join = vi.spyOn(__demoAPI, 'selfJoinOrg');
    join.mockClear();
    join.mockRejectedValueOnce(new Error('timeout'));
    const user = userEvent.setup();

    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));
    await user.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText(/Bienvenue dans Les Lions/i)).toBeInTheDocument();
    expect(join).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().pendingOrgId).toBeNull();
  });

  it('never shows the raw technical error', async () => {
    vi.spyOn(__demoAPI, 'selfJoinOrg').mockRejectedValueOnce(new Error('new row violates row-level security policy'));
    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));
    await screen.findByText(/Compte créé/i);
    expect(screen.queryByText(/row-level security/)).not.toBeInTheDocument();
  });

  it('shows "Compte créé !" heading in error fallback', async () => {
    vi.spyOn(__demoAPI, 'selfJoinOrg').mockRejectedValueOnce(new Error('forbidden'));
    render(withProviders(<JoinOrgView orgId="org-1" orgName="FC Test" />));
    expect(await screen.findByText(/Compte créé/i)).toBeInTheDocument();
  });
});

// ── 3. Vote counter (real-time) ────────────────────────────────────────────────

describe('Vote counter', () => {
  it('shows pre-existing vote count on identity step (step 0)', async () => {
    // Create a match with 4 present players, then pre-submit one vote
    const match = await __demoAPI.createMatch('org-123', 'Match du soir', [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({
      match_id: match.id, voter_name: 'Baptiste',
      best1_id: 2, best2_id: 3, lemon_id: 4,
    });

    renderApp({ initialPath: '/vote' });

    // Step 0 should be shown (identity selection)
    await screen.findByText(/Qui es-tu/i);

    // Counter should appear since voteCount > 0
    expect(await screen.findByText(/ont déjà voté/i)).toBeInTheDocument();
  });

  it('shows vote count on steps 1+ (always visible when present > 0)', async () => {
    const match = await __demoAPI.createMatch('org-123', 'Match du soir', [1, 2, 3, 4], null, 1);
    const user = userEvent.setup();

    renderApp({ initialPath: '/vote' });

    // Advance to step 1
    await screen.findByText(/Qui es-tu/i);
    await user.click(screen.getByRole('button', { name: 'Baptiste' }));

    await screen.findByText('La Pépite');

    // Counter should show "0 / 4 ont voté" (no votes yet, but always shown on step 1+)
    expect(await screen.findByText(/ont voté/i)).toBeInTheDocument();

    // Verify the present count is correct (4 players)
    expect(screen.getByText(/\/ 4/)).toBeInTheDocument();
  });

  it('shows updated count after a vote is submitted', async () => {
    const match = await __demoAPI.createMatch('org-123', 'Match', [1, 2, 3], null, 1);
    await __demoAPI.submitVote({ match_id: match.id, voter_name: 'Clément', best1_id: 2, best2_id: 3, lemon_id: 1 });
    await __demoAPI.submitVote({ match_id: match.id, voter_name: 'David',   best1_id: 1, best2_id: 3, lemon_id: 2 });

    renderApp({ initialPath: '/vote' });
    await screen.findByText(/Qui es-tu/i);

    // 2 votes already cast, 3 present → "2 / 3 ont déjà voté"
    expect(await screen.findByText(/ont déjà voté/i)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('post-vote EmptyState shows X / Y count', async () => {
    // Create a match with 4 present players and pre-submit 2 votes
    const match = await __demoAPI.createMatch('org-123', 'Match du soir', [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({ match_id: match.id, voter_name: 'Clément', best1_id: 2, best2_id: 3, lemon_id: 4 });
    await __demoAPI.submitVote({ match_id: match.id, voter_name: 'David',   best1_id: 1, best2_id: 3, lemon_id: 4 });

    // Pre-seed votedThisSession so VoteTab shows the "Vote enregistré" EmptyState
    // without needing to go through the full vote UI (already covered in player.test.jsx)
    useAppStore.setState({ votedThisSession: true });

    renderApp({ initialPath: '/vote' });

    // Should show "Vote enregistré ✓" with the count
    expect(await screen.findByText(/Vote enregistré/i)).toBeInTheDocument();
    // Count: "2 / 4 ont voté"
    expect(await screen.findByText(/2.*\/.*4.*ont voté/i)).toBeInTheDocument();
  });
});
