import { create } from 'zustand';
import { api, setCurrentOrgId, DEMO_MODE } from '@/api';
import type { UserSession, Org, EntityId } from '@/types';

// ── Org cache (localStorage) ──────────────────────────────────────────────────
// Avoids blocking the UI on slow Supabase cold-starts: on next load the app
// renders immediately from cache, then silently refreshes in the background.
const ORGS_CACHE_KEY = 'pepite_orgs_v1';
interface OrgsCache { orgs: Org[]; currentOrgId: string | null }

function readOrgsCache(): OrgsCache | null {
  try {
    const raw = localStorage.getItem(ORGS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrgsCache;
  } catch { return null; }
}
function writeOrgsCache(orgs: Org[], currentOrgId: string | null) {
  try { localStorage.setItem(ORGS_CACHE_KEY, JSON.stringify({ orgs, currentOrgId })); }
  catch { /* quota exceeded or private mode — ignore */ }
}
function clearOrgsCache() {
  try { localStorage.removeItem(ORGS_CACHE_KEY); } catch { /* ignore */ }
}

export type GuestStatus = 'checking' | 'valid' | 'invalid' | null;

interface AppStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  session:     UserSession | null;
  authLoading: boolean;

  // ── Org ───────────────────────────────────────────────────────────────────
  currentOrg:          Org | null;
  myOrgs:              Org[];
  orgsResolved:        boolean;
  orgsLoadError:       boolean;
  orgsLoadErrorDetail: string | null;

  // ── Guest ─────────────────────────────────────────────────────────────────
  guestToken:      string | null;
  guestName:       string | null;
  guestStatus:     GuestStatus;
  isVoterSession:  boolean;  // true when user arrived via ?org= or ?guest= link

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
  setOrgsLoadErrorDetail: (v: string | null) => void;
  setGuestToken:        (v: string | null) => void;
  setGuestName:         (v: string | null) => void;
  setGuestStatus:       (v: GuestStatus) => void;
  setIsVoterSession:    (v: boolean) => void;
  setTheme:             (t: string) => void;
  setVotedThisSession:  (v: boolean) => void;
  setShowOnboarding:    (v: boolean) => void;
  setLastMatchId:       (id: EntityId | null) => void;

  // ── Async actions ─────────────────────────────────────────────────────────
  loadOrgs: () => Promise<Org | null>;
  signOut:  () => Promise<void>;
}

export function resetAppStore() {
  clearOrgsCache();
  useAppStore.setState({
    session: null,
    authLoading: !DEMO_MODE,
    currentOrg: null,
    myOrgs: [],
    orgsResolved: DEMO_MODE,
    orgsLoadError: false,
    orgsLoadErrorDetail: null,
    guestToken: null,
    guestName: null,
    guestStatus: null,
    isVoterSession: false,
    theme: localStorage.getItem('pepite_theme') || 'dark',
    votedThisSession: false,
    showOnboarding: false,
    lastMatchId: null,
  });
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  session:             null,
  authLoading:         !DEMO_MODE,
  currentOrg:          null,
  myOrgs:              [],
  orgsResolved:        DEMO_MODE,
  orgsLoadError:       false,
  orgsLoadErrorDetail: null,
  guestToken:       null,
  guestName:        null,
  guestStatus:      null,
  isVoterSession:   false,
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
  setOrgsLoadError:       (v)   => set({ orgsLoadError: v }),
  setOrgsLoadErrorDetail: (v)   => set({ orgsLoadErrorDetail: v }),
  setGuestToken:       (v)   => set({ guestToken: v }),
  setGuestName:        (v)   => set({ guestName: v }),
  setGuestStatus:      (v)   => set({ guestStatus: v }),
  setIsVoterSession:   (v)   => set({ isVoterSession: v }),
  setTheme:            (t)   => set({ theme: t }),
  setVotedThisSession: (v)   => set({ votedThisSession: v }),
  setShowOnboarding:   (v)   => set({ showOnboarding: v }),
  setLastMatchId:      (id)  => set({ lastMatchId: id }),

  // ── Async actions ──────────────────────────────────────────────────────────
  loadOrgs: async () => {
    set({ orgsLoadError: false, orgsLoadErrorDetail: null });

    // ── 1. Restore from cache immediately (instant UI, even on cold start) ──
    const cached = readOrgsCache();
    let restoredFromCache = false;
    if (cached?.orgs.length) {
      const cachedCurrent = cached.orgs.find(o => o.id === cached.currentOrgId) || cached.orgs[0];
      set({
        myOrgs: cached.orgs,
        currentOrg: cachedCurrent,
        orgsResolved: true,       // unblock the UI right now
      });
      setCurrentOrgId(cachedCurrent.id);
      restoredFromCache = true;
    }

    // ── 2. Fetch from server (blocking if no cache, background if cache hit) ─
    try {
      const orgs = await api.getMyOrgs();
      // Success — always clear any error flag (the hard-timeout may have set it
      // while we were still awaiting a slow cold-start wake-up).
      set({ myOrgs: orgs, orgsLoadError: false, orgsLoadErrorDetail: null });
      if (orgs.length) {
        const currentOrgId = get().currentOrg?.id ?? null;
        const current = orgs.find(o => o.id === currentOrgId) || orgs[0];
        set({ currentOrg: current });
        setCurrentOrgId(current.id);
        writeOrgsCache(orgs, current.id);   // persist for next load
        return current;
      }
      writeOrgsCache([], null);
      return null;
    } catch (err) {
      console.error('loadOrgs:', err);
      if (restoredFromCache) {
        // Already showing the app from cache — swallow the error silently so
        // the user isn't interrupted by a network hiccup or slow cold-start.
        console.warn('loadOrgs: server refresh failed, keeping cached data');
        return get().currentOrg;
      }
      // No cache and no server — only show the error screen as last resort.
      set({ orgsLoadError: true, orgsLoadErrorDetail: (err as Error).message ?? null });
      return null;
    } finally {
      set({ orgsResolved: true });
    }
  },

  signOut: async () => {
    await api.signOut();
    clearOrgsCache();
    set({ session: null, currentOrg: null, myOrgs: [] });
    setCurrentOrgId(null);
  },
}));
