import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { useAppStore } from "@/store/appStore";
import { renderApp } from "./renderApp";

// Demo org fixture — matches the demoAPI.getMyOrg() return value
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
    expect(await screen.findByText("Match du soir")).toBeInTheDocument();
  });

  it("shows admin UI when navigating to admin tab", async () => {
    renderApp();
    const user = userEvent.setup();
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    expect(await screen.findByText("Match du soir")).toBeInTheDocument();
    expect(await screen.findByText("Effectif")).toBeInTheDocument();
  });

  it("can create a match", async () => {
    renderApp();
    const user = userEvent.setup();

    // Go to admin tab
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    await screen.findByText("Match du soir");

    // Type match name
    const matchInput = screen.getByPlaceholderText(/vs Dragons/i);
    await user.type(matchInput, "Match test");

    // Select 4 players — use the first occurrence of each name (match form chips)
    const antoineBtns = screen.getAllByRole("button", { name: "Antoine" });
    await user.click(antoineBtns[0]);
    const baptisteBtns = screen.getAllByRole("button", { name: "Baptiste" });
    await user.click(baptisteBtns[0]);
    const clementBtns = screen.getAllByRole("button", { name: "Clément" });
    await user.click(clementBtns[0]);
    const davidBtns = screen.getAllByRole("button", { name: "David" });
    await user.click(davidBtns[0]);

    // Click launch button
    const launchBtn = screen.getByRole("button", { name: /Lancer le vote/i });
    await user.click(launchBtn);

    // Verify match was created via API
    const activeMatch = await __demoAPI.getActiveMatch();
    expect(activeMatch).not.toBeNull();
    expect(activeMatch.label).toBe("Match test");
  });

  it("shows guest section when match is active", async () => {
    // Create a match via API directly
    await __demoAPI.createMatch("Match actif", [1, 2, 3, 4, 5], null, 1);

    renderApp();
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);

    expect(await screen.findByText("Supporters invités")).toBeInTheDocument();
  });

  it("can create a guest token", async () => {
    await __demoAPI.createMatch("Match actif", [1, 2, 3, 4, 5], null, 1);

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
    await __demoAPI.createMatch("CopyOrgTest", [1, 2, 3, 4, 5], null, 1);
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
    await __demoAPI.createMatch("CopyGuestTest", [1, 2, 3, 4, 5], null, 1);

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
    await __demoAPI.createMatch("CopyFallbackTest", [1, 2, 3, 4, 5], null, 1);
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
