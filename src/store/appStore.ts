import { create } from 'zustand';
import { api, setCurrentOrgId, DEMO_MODE } from '@/api';
import type { UserSession, Org, EntityId } from '@/types';

export type GuestStatus = 'checking' | 'valid' | 'invalid' | null;

interface AppStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  session:     UserSession | null;
  authLoading: boolean;

  // ── Org ───────────────────────────────────────────────────────────────────
  currentOrg:    Org | null;
  myOrgs:        Org[];
  orgsResolved:  boolean;
  orgsLoadError: boolean;

  // ── Guest ─────────────────────────────────────────────────────────────────
  guestToken:  string | null;
  guestName:   string | null;
  guestStatus: GuestStatus;

  // ── UI ────────────────────────────────────────────────────────────────────
  theme:             string;
  votedThisSession:  boolean;
  showOnboarding:    boolean;
  lastMatchId:       EntityId | null;

  // ── Setters ───────────────────────────────────────────────────────────────
  setSession:           (s: UserSession | null) => void;
  setAuthLoading:       (v: boolean) => void;
  setCurrentOrg:        (org: Org | null) => void;
  setMyOrgs:            (orgs: Org[]) => void;
  setOrgsResolved:      (v: boolean) => void;
  setOrgsLoadError:     (v: boolean) => void;
  setGuestToken:        (v: string | null) => void;
  setGuestName:         (v: string | null) => void;
  setGuestStatus:       (v: GuestStatus) => void;
  setTheme:             (t: string) => void;
  setVotedThisSession:  (v: boolean) => void;
  setShowOnboarding:    (v: boolean) => void;
  setLastMatchId:       (id: EntityId | null) => void;

  // ── Async actions ─────────────────────────────────────────────────────────
  loadOrgs: () => Promise<Org | null>;
  signOut:  () => Promise<void>;
}

export function resetAppStore() {
  useAppStore.setState({
    session: null,
    authLoading: !DEMO_MODE,
    currentOrg: null,
    myOrgs: [],
    orgsResolved: DEMO_MODE,
    orgsLoadError: false,
    guestToken: null,
    guestName: null,
    guestStatus: null,
    theme: localStorage.getItem('pepite_theme') || 'dark',
    votedThisSession: false,
    showOnboarding: false,
    lastMatchId: null,
  });
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  session:          null,
  authLoading:      !DEMO_MODE,
  currentOrg:       null,
  myOrgs:           [],
  orgsResolved:     DEMO_MODE,
  orgsLoadError:    false,
  guestToken:       null,
  guestName:        null,
  guestStatus:      null,
  theme:            localStorage.getItem('pepite_theme') || 'dark',
  votedThisSession: false,
  showOnboarding:   false,
  lastMatchId:      null,

  // Setters
  setSession:          (s)   => set({ session: s }),
  setAuthLoading:      (v)   => set({ authLoading: v }),
  setCurrentOrg:       (org) => set({ currentOrg: org }),
  setMyOrgs:           (orgs) => set({ myOrgs: orgs }),
  setOrgsResolved:     (v)   => set({ orgsResolved: v }),
  setOrgsLoadError:    (v)   => set({ orgsLoadError: v }),
  setGuestToken:       (v)   => set({ guestToken: v }),
  setGuestName:        (v)   => set({ guestName: v }),
  setGuestStatus:      (v)   => set({ guestStatus: v }),
  setTheme:            (t)   => set({ theme: t }),
  setVotedThisSession: (v)   => set({ votedThisSession: v }),
  setShowOnboarding:   (v)   => set({ showOnboarding: v }),
  setLastMatchId:      (id)  => set({ lastMatchId: id }),

  // ── Async actions ──────────────────────────────────────────────────────────
  loadOrgs: async () => {
    set({ orgsLoadError: false });
    try {
      const orgs = await api.getMyOrgs();
      set({ myOrgs: orgs });
      if (orgs.length) {
        const currentOrgId = get().currentOrg?.id ?? null;
        const current = orgs.find(o => o.id === currentOrgId) || orgs[0];
        set({ currentOrg: current });
        setCurrentOrgId(current.id);
        return current;
      }
      return null;
    } catch (err) {
      console.error('loadOrgs:', err);
      set({ orgsLoadError: true });
      return null;
    } finally {
      set({ orgsResolved: true });
    }
  },

  signOut: async () => {
    await api.signOut();
    set({ session: null, currentOrg: null });
    setCurrentOrgId(null);
  },
}));
