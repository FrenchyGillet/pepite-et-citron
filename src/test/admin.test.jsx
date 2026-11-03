import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { useAppStore } from "@/store/appStore";
import { renderApp } from "./renderApp";

// Demo org fixture — matches the demoAPI.getMyOrgs() entry
const DEMO_ORG = { id: "demo-org", name: "Demo", slug: "demo", role: "admin" };

beforeEach(() => {
  __resetDemoState();
});

describe("Admin flow", () => {
  // En DEMO_MODE, l'admin est toujours connecté — pas de formulaire de mot de passe
  it("shows admin tab and UI directly in demo mode", async () => {
    renderApp();
    const user = userEvent.setup();
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    expect(await screen.findByText("Lancer un vote")).toBeInTheDocument();
  });

  it("shows admin UI when navigating to admin tab", async () => {
    renderApp();
    const user = userEvent.setup();
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    expect(await screen.findByText("Lancer un vote")).toBeInTheDocument();
    expect(await screen.findByText("Effectif")).toBeInTheDocument();
  });

  it("can create a match", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));
    await screen.findByText("Lancer un vote");

    // The whole squad by default: one tap opens the vote.
    await user.type(screen.getByLabelText(/nom du match/i), "Match test");
    await user.click(screen.getByRole("button", { name: "Lancer le vote · 10 joueurs" }));
    expect(await screen.findByText("Match ouvert !")).toBeInTheDocument();
    const match = await __demoAPI.getActiveMatch("org-123");
    expect(match.label).toBe("Match test");
    expect(match.present_ids).toHaveLength(10);
  });

  it("names the match after the day when no name is typed", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));
    await user.click(await screen.findByRole("button", { name: /Lancer le vote/i }));
    await screen.findByText("Match ouvert !");
    expect((await __demoAPI.getActiveMatch("org-123")).label).toMatch(/^Match du /);
  });

  it("loads the last vote's team and lets the organiser remove an absent", async () => {
    const team = await __demoAPI.createTeam("org-123", "Équipe A", [1, 2, 3, 4]);
    const old = await __demoAPI.createMatch("org-123", "Ancien", [1, 2, 3, 4], team.id, 1);
    await __demoAPI.closeMatch(old.id);
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));

    expect(await screen.findByRole("combobox", { name: "Qui joue ?" })).toHaveValue(String(team.id));
    await user.click(screen.getByRole("button", { name: "Modifier" }));
    await user.click(screen.getByRole("button", { name: "David", pressed: true }));
    await user.click(screen.getByRole("button", { name: "Lancer le vote · 3 joueurs" }));
    await screen.findByText("Match ouvert !");
    const match = await __demoAPI.getActiveMatch("org-123");
    expect(match.present_ids).toEqual([1, 2, 3]);
    expect(match.team_id).toBe(team.id);
  });
  it("shows guest section when match is active", async () => {
    // Create a match via API directly
    await __demoAPI.createMatch('org-123', "Match actif", [1, 2, 3, 4, 5], null, 1);

    renderApp();
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);

    expect(await screen.findByText("Supporters invités")).toBeInTheDocument();
  });

  it("can create a guest token", async () => {
    await __demoAPI.createMatch('org-123', "Match actif", [1, 2, 3, 4, 5], null, 1);

    renderApp();
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    await screen.findByText("Supporters invités");

    const guestInput = screen.getByPlaceholderText(/Prénom du supporter/i);
    await user.type(guestInput, "Tonton");
    // Cible exactement "Créer" (et non "＋ Créer une équipe" dans la section Équipes)
    await user.click(screen.getByRole("button", { name: /^Créer$/i }));

    expect(await screen.findByText("Tonton")).toBeInTheDocument();
    expect(await screen.findByText("En attente")).toBeInTheDocument();
  });
});

describe("Destructive actions use the confirm modal (not window.confirm)", () => {
  it("archiving a player asks for confirmation, then archives on confirm (never deletes)", async () => {
    renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /admin/i }));
    await user.click(await screen.findByRole("button", { name: /Effectif/i }));

    // Antoine is player #1 in the demo roster
    await user.click(await screen.findByRole("button", { name: "Archiver Antoine" }));

    // Modal, not a native prompt
    expect(await screen.findByText(/Archiver Antoine \?/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archiver" }));

    await screen.findByText("Antoine archivé");
    const players = await __demoAPI.getPlayers('org-123');
    expect(players).toHaveLength(10); // kept, for the history
    expect(players.find(p => p.id === 1)?.archived_at).toBeTruthy();
  });

  it("cancelling the confirm modal keeps the player active", async () => {
    renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /admin/i }));
    await user.click(await screen.findByRole("button", { name: /Effectif/i }));
    await user.click(await screen.findByRole("button", { name: "Archiver Antoine" }));

    await user.click(await screen.findByRole("button", { name: "Annuler" }));
    const players = await __demoAPI.getPlayers('org-123');
    expect(players).toHaveLength(10);
    expect(players.find(p => p.id === 1)?.archived_at).toBeFalsy();
  });
});

describe("Close match without reveal (confirmation dialog)", () => {
  async function openAdmin() {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));
    return user;
  }

  it("asks for confirmation before closing, naming the match", async () => {
    await __demoAPI.createMatch('org-123', "Match actif", [1, 2, 3, 4, 5], null, 1);
    const user = await openAdmin();

    await user.click(await screen.findByRole("button", { name: /clore sans dépouiller/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Match actif/)).toBeInTheDocument();
    expect(within(dialog).getByText(/ne seront jamais révélés/)).toBeInTheDocument();
    expect(await __demoAPI.getActiveMatch('org-123')).not.toBeNull();
  });

  it("keeps the vote open when the admin cancels", async () => {
    await __demoAPI.createMatch('org-123', "Match actif", [1, 2, 3, 4, 5], null, 1);
    const user = await openAdmin();

    await user.click(await screen.findByRole("button", { name: /clore sans dépouiller/i }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await __demoAPI.getActiveMatch('org-123')).not.toBeNull();
  });

  it("closes the match and shows a toast once confirmed", async () => {
    await __demoAPI.createMatch('org-123', "Match actif", [1, 2, 3, 4, 5], null, 1);
    const user = await openAdmin();

    await user.click(await screen.findByRole("button", { name: /clore sans dépouiller/i }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Clore sans dépouiller" }));

    expect(await screen.findByText("Vote clôturé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clore sans dépouiller/i })).not.toBeInTheDocument();
  });
});

describe("Launch match — choosing the line-up", () => {
  it("lists the teams and launches with the picked one", async () => {
    const a = await __demoAPI.createTeam("org-123", "Équipe A", [1, 2, 3, 4]);
    const b = await __demoAPI.createTeam("org-123", "Équipe B", [5, 6, 7]);
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));

    const select = await screen.findByRole("combobox", { name: "Qui joue ?" });
    expect(within(select).getAllByRole("option").map(o => o.textContent)).toEqual([
      "Tout l'effectif · 10 joueurs", "Équipe A · 4 joueurs", "Équipe B · 3 joueurs",
    ]);
    expect(select).toHaveValue("");

    await user.selectOptions(select, String(b.id));
    expect(screen.getByText("3 présents")).toBeInTheDocument();
    await user.selectOptions(select, String(a.id));
    await user.click(screen.getByRole("button", { name: "Lancer le vote · 4 joueurs" }));
    await screen.findByText("Match ouvert !");
    const match = await __demoAPI.getActiveMatch("org-123");
    expect(match.team_id).toBe(a.id);
    expect(match.present_ids).toEqual([1, 2, 3, 4]);
  });
});

describe("Launch match — minimum players validation", () => {
  // Opens the launcher's player list and keeps only these players.
  async function keepOnly(user, names) {
    await user.click(await screen.findByRole("button", { name: /admin/i }));
    await user.click(await screen.findByRole("button", { name: "Modifier" }));
    await user.click(screen.getByRole("button", { name: "Aucun" }));
    for (const name of names) await user.click(screen.getByRole("button", { name, pressed: false }));
  }

  it("disables 'Lancer le vote' when fewer than 3 players are selected (2-pépite mode)", async () => {
    renderApp();
    const user = userEvent.setup();
    await keepOnly(user, ["Antoine", "Baptiste"]);
    expect(screen.getByRole("button", { name: /Lancer le vote/i })).toBeDisabled();
    expect(screen.getByText(/au moins 3 joueurs/i)).toBeInTheDocument();
  });

  it("enables 'Lancer le vote' with exactly 3 players in 2-pépite mode", async () => {
    renderApp();
    const user = userEvent.setup();
    await keepOnly(user, ["Antoine", "Baptiste", "Clément"]);
    expect(screen.getByRole("button", { name: /Lancer le vote/i })).not.toBeDisabled();
  });

  it("requires 4 players in 3-pépite mode and shows the correct hint", async () => {
    renderApp();
    const user = userEvent.setup();
    await keepOnly(user, ["Antoine", "Baptiste", "Clément"]);
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /3 pépites/i }));

    expect(screen.getByRole("button", { name: /Lancer le vote/i })).toBeDisabled();
    expect(screen.getByText(/au moins 4 joueurs/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "David", pressed: false }));
    expect(screen.getByRole("button", { name: /Lancer le vote/i })).not.toBeDisabled();
  });

  it("updates minimum when switching between 2 and 3-pépite modes", async () => {
    renderApp();
    const user = userEvent.setup();
    await keepOnly(user, ["Antoine", "Baptiste", "Clément"]);
    expect(screen.getByRole("button", { name: /Lancer le vote/i })).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /3 pépites/i }));
    expect(screen.getByRole("button", { name: /Lancer le vote/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^⭐ ⭐ 2 pépites/ }));
    expect(screen.getByRole("button", { name: /Lancer le vote/i })).not.toBeDisabled();
  });
});

describe("Copy link buttons", () => {
  afterEach(() => {
    // Restore a clean clipboard spy in case a test replaced it.
    // writable: true is required so Object.assign works in subsequent tests.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  it("'Copier' (match section) shows 'Lien copié !' toast after click", async () => {
    await __demoAPI.createMatch('org-123', "CopyOrgTest", [1, 2, 3, 4, 5], null, 1);
    // The "Copier" button requires currentOrg.slug — set it in the store
    useAppStore.setState({ currentOrg: DEMO_ORG });

    renderApp();
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);

    // "Copier" button appears in the active-match card once a match is open
    const copyBtn = await screen.findByRole("button", { name: /^Copier$/i });
    await user.click(copyBtn);

    expect(await screen.findByText("Lien copié !")).toBeInTheDocument();
  });

  it("'Copier le lien' (guest token) switches button label to 'Copié !'", async () => {
    await __demoAPI.createMatch('org-123', "CopyGuestTest", [1, 2, 3, 4, 5], null, 1);

    renderApp();
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    await screen.findByText("Supporters invités");

    // Create a guest token
    const guestInput = screen.getByPlaceholderText(/Prénom du supporter/i);
    await user.type(guestInput, "Tata");
    await user.click(screen.getByRole("button", { name: /^Créer$/i }));
    await screen.findByText("Tata");

    // Click the inline copy button on the guest row
    const copyGuestBtn = await screen.findByRole("button", { name: /copier le lien/i });
    await user.click(copyGuestBtn);

    // Button label switches to "Copié !" for 2 s as inline feedback
    expect(await screen.findByRole("button", { name: /Copié !/i })).toBeInTheDocument();
  });

  it("shows toast even when clipboard API is unavailable (graceful fallback)", async () => {
    await __demoAPI.createMatch('org-123', "CopyFallbackTest", [1, 2, 3, 4, 5], null, 1);
    useAppStore.setState({ currentOrg: DEMO_ORG });

    // Simulate permission denied / non-HTTPS context where writeText rejects.
    // The execCommand fallback path is unit-tested in clipboard.test.ts;
    // here we verify the UX outcome: the toast still appears for the user.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) },
      configurable: true,
      writable: true,
    });

    renderApp();
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);

    const copyBtn = await screen.findByRole("button", { name: /^Copier$/i });
    await user.click(copyBtn);

    // The toast must appear regardless of which copy path was taken
    expect(await screen.findByText("Lien copié !")).toBeInTheDocument();
  });
});
