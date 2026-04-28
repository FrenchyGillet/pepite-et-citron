/**
 * Isolated component tests with RTL.
 *
 * Each describe block renders ONE component in isolation — no full App,
 * no network, no router (except where the component strictly requires one).
 * The goal is to verify rendering logic and callback wiring, not
 * application-level flows (those live in the other *.test.* files).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { EmptyState }      from '@/components/EmptyState';
import { Toast }           from '@/components/Toast';
import { StatsLockedView } from '@/components/StatsLockedView';
import { GuestPromoView }  from '@/components/GuestPromoView';
import { useAppStore }     from '@/store/appStore';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Minimal router wrapper — only needed for components using useNavigate. */
function withRouter(ui) {
  return <MemoryRouter>{ui}</MemoryRouter>;
}

// ── EmptyState ─────────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState icon={<circle cx="12" cy="12" r="10" />} title="Rien ici" />);
    expect(screen.getByText('Rien ici')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <EmptyState
        icon={<circle cx="12" cy="12" r="10" />}
        title="Titre"
        subtitle="Une précision utile"
      />
    );
    expect(screen.getByText('Une précision utile')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    render(<EmptyState icon={<circle cx="12" cy="12" r="10" />} title="Titre" />);
    expect(screen.queryByText('Une précision utile')).not.toBeInTheDocument();
  });

  it('renders action button with correct label', () => {
    render(
      <EmptyState
        icon={<circle cx="12" cy="12" r="10" />}
        title="Titre"
        action={{ label: 'Ajouter', onClick: vi.fn() }}
      />
    );
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
  });

  it('calls action.onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={<circle cx="12" cy="12" r="10" />}
        title="Titre"
        action={{ label: 'Ajouter', onClick }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render a button when action is null', () => {
    render(
      <EmptyState icon={<circle cx="12" cy="12" r="10" />} title="Titre" action={null} />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ── Toast ──────────────────────────────────────────────────────────────────────

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders the message', () => {
    const onDone = vi.fn();
    render(<Toast msg="Joueur ajouté !" onDone={onDone} />);
    expect(screen.getByText('Joueur ajouté !')).toBeInTheDocument();
  });

  it('calls onDone after 2500 ms', () => {
    const onDone = vi.fn();
    render(<Toast msg="Ok" onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2500); });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('does not call onDone before 2500 ms', () => {
    const onDone = vi.fn();
    render(<Toast msg="Ok" onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(2499); });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('clears the timer on unmount (no call after unmount)', () => {
    const onDone = vi.fn();
    const { unmount } = render(<Toast msg="Ok" onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(1000); });
    unmount();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDone).not.toHaveBeenCalled();
  });
});

// ── StatsLockedView ────────────────────────────────────────────────────────────

describe('StatsLockedView', () => {
  it('renders the lock icon and heading', () => {
    render(<StatsLockedView onUpgrade={vi.fn()} />);
    expect(screen.getByText('🔒')).toBeInTheDocument();
    expect(screen.getByText('Stats de saison')).toBeInTheDocument();
  });

  it('renders the upgrade button', () => {
    render(<StatsLockedView onUpgrade={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /passer pro/i })
    ).toBeInTheDocument();
  });

  it('calls onUpgrade when button is clicked', () => {
    const onUpgrade = vi.fn();
    render(<StatsLockedView onUpgrade={onUpgrade} />);
    fireEvent.click(screen.getByRole('button', { name: /passer pro/i }));
    expect(onUpgrade).toHaveBeenCalledOnce();
  });

  it('renders the descriptive copy', () => {
    render(<StatsLockedView onUpgrade={vi.fn()} />);
    expect(screen.getByText(/classement cumulé/i)).toBeInTheDocument();
  });
});

// ── GuestPromoView ─────────────────────────────────────────────────────────────

describe('GuestPromoView', () => {
  it('renders the success heading', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} />));
    expect(screen.getByText(/vote enregistré/i)).toBeInTheDocument();
  });

  it('renders the promo card', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} />));
    expect(screen.getByText(/créer mon équipe gratuitement/i)).toBeInTheDocument();
  });

  it('shows "Voir les résultats" button when canSeeResults=true', () => {
    render(withRouter(<GuestPromoView canSeeResults={true} />));
    expect(screen.getByRole('button', { name: /voir les résultats/i })).toBeInTheDocument();
  });

  it('hides "Voir les résultats" button when canSeeResults=false', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} />));
    expect(screen.queryByRole('button', { name: /voir les résultats/i })).not.toBeInTheDocument();
  });

  it('clears voter-session store flags when CTA is clicked', () => {
    // Pre-seed store with voter state
    useAppStore.setState({ isVoterSession: true, guestStatus: 'valid', guestToken: 'tok-abc' });

    render(withRouter(<GuestPromoView canSeeResults={false} />));
    fireEvent.click(screen.getByRole('button', { name: /créer mon équipe gratuitement/i }));

    const { isVoterSession, guestStatus, guestToken } = useAppStore.getState();
    expect(isVoterSession).toBe(false);
    expect(guestStatus).toBeNull();
    expect(guestToken).toBeNull();
  });

  // ── Personalization with voterName / orgName ────────────────────────────────

  it('shows personalized heading when voterName is provided', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} voterName="Kevin" />));
    expect(screen.getByText(/Bien joué, Kevin/i)).toBeInTheDocument();
  });

  it('shows generic heading when voterName is null', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} voterName={null} />));
    expect(screen.getByText(/Vote enregistré/i)).toBeInTheDocument();
  });

  it('shows org-specific CTA button when orgName is provided', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} orgName="FC Test" />));
    expect(screen.getByRole('button', { name: /Rejoindre FC Test/i })).toBeInTheDocument();
  });

  it('shows generic CTA button when orgName is null', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} orgName={null} />));
    expect(screen.getByRole('button', { name: /créer mon équipe gratuitement/i })).toBeInTheDocument();
  });

  it('shows org-specific subtitle when orgName is provided', () => {
    render(withRouter(<GuestPromoView canSeeResults={false} orgName="FC Test" />));
    expect(screen.getByText(/Tu fais partie de l'équipe FC Test/i)).toBeInTheDocument();
  });

  it('clears store flags when org-specific CTA is clicked', () => {
    useAppStore.setState({ isVoterSession: true, guestStatus: null, guestToken: null });
    render(withRouter(<GuestPromoView canSeeResults={false} orgName="FC Test" />));
    fireEvent.click(screen.getByRole('button', { name: /Rejoindre FC Test/i }));
    expect(useAppStore.getState().isVoterSession).toBe(false);
  });
});
