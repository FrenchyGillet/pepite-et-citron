/**
 * flows.test.jsx — Integration tests for flows not covered elsewhere.
 *
 * Covers three gaps identified in the diagram audit:
 *   1. JoinOrgView  — auto-join lifecycle after ?org= signup
 *   2. OrgSetupView — slug hidden from user, vote link preview
 *   3. Vote counter — real-time count shown in VoteView + post-vote screen
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
import { OrgSetupView }  from '@/components/OrgSetupView';
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

  it('clears pendingOrgId even when selfJoinOrg fails', async () => {
    useAppStore.setState({ pendingOrgId: 'org-1' });
    vi.spyOn(__demoAPI, 'selfJoinOrg').mockRejectedValueOnce(new Error('RLS'));

    render(withProviders(<JoinOrgView orgId="org-1" orgName="Les Lions" />));

    await waitFor(() => {
      expect(useAppStore.getState().pendingOrgId).toBeNull();
    });
  });

  it('shows "Compte créé !" heading in error fallback', async () => {
    vi.spyOn(__demoAPI, 'selfJoinOrg').mockRejectedValueOnce(new Error('forbidden'));
    render(withProviders(<JoinOrgView orgId="org-1" orgName="FC Test" />));
    expect(await screen.findByText(/Compte créé/i)).toBeInTheDocument();
  });
});

// ── 2. OrgSetupView ────────────────────────────────────────────────────────────

describe('OrgSetupView', () => {
  it('does NOT show an "Identifiant unique" label', () => {
    render(withProviders(<OrgSetupView onOrgCreated={vi.fn()} />));
    expect(screen.queryByText(/identifiant unique/i)).not.toBeInTheDocument();
  });

  it('does NOT render a visible slug text input', () => {
    render(withProviders(<OrgSetupView onOrgCreated={vi.fn()} />));
    // Only one visible text input: the name field
    const textInputs = screen.getAllByRole('textbox');
    expect(textInputs).toHaveLength(1);
    expect(textInputs[0]).toHaveAttribute('placeholder', expect.stringMatching(/HC Montréal/i));
  });

  it('shows vote link preview after typing team name', async () => {
    const user = userEvent.setup();
    render(withProviders(<OrgSetupView onOrgCreated={vi.fn()} />));

    await user.type(screen.getByPlaceholderText(/HC Montréal/i), 'Les Lions');

    // Label appears
    expect(await screen.findByText(/Lien de vote de votre équipe/i)).toBeInTheDocument();
    // Slug part renders inside a <strong> — query by the slug text directly
    expect(await screen.findByText('les-lions')).toBeInTheDocument();
  });

  it('auto-generates slug from team name (lowercase, no accents)', async () => {
    const user = userEvent.setup();
    render(withProviders(<OrgSetupView onOrgCreated={vi.fn()} />));

    await user.type(screen.getByPlaceholderText(/HC Montréal/i), 'Étoile du Nord');

    // Slug rendered in <strong> — check the generated value directly
    expect(await screen.findByText('etoile-du-nord')).toBeInTheDocument();
  });

  it('shows name-field error when duplicate slug (not an invisible slug error)', async () => {
    const user = userEvent.setup();
    // Make createOrg throw a duplicate error
    vi.spyOn(__demoAPI, 'createOrg').mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

    render(withProviders(<OrgSetupView onOrgCreated={vi.fn()} />));

    await user.type(screen.getByPlaceholderText(/HC Montréal/i), 'Les Lions');
    await user.click(screen.getByRole('button', { name: /Créer l'équipe/i }));

    // Error must be visible and mention the name, not a hidden slug field
    expect(await screen.findByText(/Ce nom d'équipe est déjà utilisé/i)).toBeInTheDocument();
  });

  it('calls onOrgCreated with the created org', async () => {
    const user = userEvent.setup();
    const onOrgCreated = vi.fn();
    render(withProviders(<OrgSetupView onOrgCreated={onOrgCreated} />));

    await user.type(screen.getByPlaceholderText(/HC Montréal/i), 'Les Lions');
    await user.click(screen.getByRole('button', { name: /Créer l'équipe/i }));

    await waitFor(() => expect(onOrgCreated).toHaveBeenCalledOnce());
    expect(onOrgCreated).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Les Lions', slug: 'les-lions' })
    );
  });
});

// ── 3. Vote counter (real-time) ────────────────────────────────────────────────

describe('Vote counter', () => {
  it('shows pre-existing vote count on identity step (step 0)', async () => {
    // Create a match with 4 present players, then pre-submit one vote
    const match = await __demoAPI.createMatch('Match du soir', [1, 2, 3, 4], null, 1);
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
    const match = await __demoAPI.createMatch('Match du soir', [1, 2, 3, 4], null, 1);
    const user = userEvent.setup();

    renderApp({ initialPath: '/vote' });

    // Advance to step 1
    await screen.findByText(/Qui es-tu/i);
    await user.click(screen.getByRole('button', { name: 'Baptiste' }));
    await user.click(screen.getByRole('button', { name: /Continuer/i }));

    await screen.findByText('La Pépite');

    // Counter should show "0 / 4 ont voté" (no votes yet, but always shown on step 1+)
    expect(await screen.findByText(/ont voté/i)).toBeInTheDocument();

    // Verify the present count is correct (4 players)
    expect(screen.getByText(/\/ 4/)).toBeInTheDocument();
  });

  it('shows updated count after a vote is submitted', async () => {
    const match = await __demoAPI.createMatch('Match', [1, 2, 3], null, 1);
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
    const match = await __demoAPI.createMatch('Match du soir', [1, 2, 3, 4], null, 1);
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
