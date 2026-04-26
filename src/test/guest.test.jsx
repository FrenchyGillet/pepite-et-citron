import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { useAppStore } from "@/store/appStore";
import { renderApp } from "./renderApp";

beforeEach(() => {
  __resetDemoState();
});

describe("Guest token flow", () => {
  it("valid token skips step 0 and shows welcome banner", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Tonton", match.id);

    renderApp({ initialPath: `/vote?guest=${token}` });

    expect(await screen.findByText(/Bienvenu\(e\), Tonton !/i)).toBeInTheDocument();
    expect(screen.queryByText("Qui es-tu ?")).toBeNull();
    // Should be at step 1 directly
    expect(await screen.findByText("La Pépite")).toBeInTheDocument();
  });

  it("invalid token shows error", async () => {
    renderApp({ initialPath: "/vote?guest=invalidtoken999" });

    expect(
      await screen.findByText(/Ce lien a déjà été utilisé ou n'existe pas\./i)
    ).toBeInTheDocument();
  });

  it("used/consumed token shows error", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Tonton", match.id);
    await __demoAPI.useGuestToken(token);

    renderApp({ initialPath: `/vote?guest=${token}` });

    expect(
      await screen.findByText(/Ce lien a déjà été utilisé ou n'existe pas\./i)
    ).toBeInTheDocument();
  });

  it("guest completes vote and token is marked used", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Tonton", match.id);

    renderApp({ initialPath: `/vote?guest=${token}` });
    const user = userEvent.setup();

    // Step 1: La Pépite
    await screen.findByText("La Pépite");
    await user.click(screen.getByRole("button", { name: "Baptiste" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    // Step 2: 2ème meilleur
    await screen.findByText("2ème meilleur");
    await user.click(screen.getByRole("button", { name: "Clément" }));
    const suivantBtns = screen.getAllByRole("button", { name: "Suivant" });
    await user.click(suivantBtns[suivantBtns.length - 1]);

    // Step 3: Le Citron
    await screen.findByText("Le Citron");
    await user.click(screen.getByRole("button", { name: "David" }));
    const suivantBtns2 = screen.getAllByRole("button", { name: "Suivant" });
    await user.click(suivantBtns2[suivantBtns2.length - 1]);

    // Submit
    await screen.findByText("Récapitulatif");
    await user.click(screen.getByRole("button", { name: "Rendre mon verdict →" }));

    // After voting, handleVoted() navigates to /results and handleGuestVoted marks the token
    // Wait for the results tab to appear (confirms vote flow completed)
    expect(await screen.findByText("Résultats masqués")).toBeInTheDocument();

    // Verify token is marked used
    const tokens = await __demoAPI.getGuestTokens(match.id);
    const t = tokens.find((t) => t.token === token);
    expect(t).toBeDefined();
    expect(t.used).toBe(true);
  });

  // ── Regression: guest URL survives navigate('/vote') ──────────────────────
  // In production mode, useGuest calls navigate('/vote') after validation,
  // which strips ?guest= from the URL. isVoterLink must stay truthy via the
  // store's guestStatus/guestToken, otherwise the AuthView is shown.
  // In DEMO_MODE (used by tests) the auth gate is bypassed unconditionally,
  // so we verify the equivalent: that guestStatus is set to 'valid' in the
  // store (the value isVoterLink now relies on) before navigate fires.
  it("sets guestStatus=valid in store before navigating away from guest URL", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Tonton", match.id);

    renderApp({ initialPath: `/vote?guest=${token}` });

    // Wait until the guest welcome appears (confirms validation completed)
    await screen.findByText(/Bienvenu\(e\), Tonton !/i);

    // The store must have guestStatus='valid' — this is what keeps isVoterLink
    // truthy in production after the URL params are stripped by navigate().
    await waitFor(() => {
      expect(useAppStore.getState().guestStatus).toBe('valid');
      expect(useAppStore.getState().guestToken).toBe(token);
    });
  });
});

// ── 3-pépite mode ──────────────────────────────────────────────────────────────
describe("3-pépite mode", () => {
  it("shows 4 vote steps and submits best3 without error", async () => {
    // pepiteCount=3 → 4 steps (pépite 1, pépite 2, pépite 3, citron)
    const match = await __demoAPI.createMatch("Match 3P", [1, 2, 3, 4, 5, 6], null, 1, 3);
    const token = await __demoAPI.createGuestToken("Joueur", match.id);

    renderApp({ initialPath: `/vote?guest=${token}` });
    const user = userEvent.setup();

    // Step 1 — La Pépite (3 pts)
    await screen.findByText("La Pépite");
    await user.click(screen.getByRole("button", { name: "Baptiste" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    // Step 2 — 2ème meilleur (2 pts)
    await screen.findByText("2ème meilleur");
    await user.click(screen.getByRole("button", { name: "Clément" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    // Step 3 — 3ème meilleur (1 pt) — only exists in 3-pépite mode
    await screen.findByText("3ème meilleur");
    await user.click(screen.getByRole("button", { name: "David" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    // Step 4 — Le Citron
    await screen.findByText("Le Citron");
    await user.click(screen.getByRole("button", { name: "Étienne" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    // Summary — verify all 3 pépites appear
    await screen.findByText("Récapitulatif");
    expect(screen.getByText("Baptiste")).toBeInTheDocument();
    expect(screen.getByText("Clément")).toBeInTheDocument();
    expect(screen.getByText("David")).toBeInTheDocument();

    // Submit — must not throw "column not found" error
    await user.click(screen.getByRole("button", { name: "Rendre mon verdict →" }));
    expect(await screen.findByText("Résultats masqués")).toBeInTheDocument();

    // Verify vote was stored with best3_id
    const votes = await __demoAPI.getVotes(match.id);
    expect(votes).toHaveLength(1);
    expect(votes[0].best3_id).toBeDefined();
  });

  it("does NOT show 3ème meilleur step in standard 2-pépite mode", async () => {
    const match = await __demoAPI.createMatch("Match 2P", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Joueur", match.id);

    renderApp({ initialPath: `/vote?guest=${token}` });
    const user = userEvent.setup();

    await screen.findByText("La Pépite");
    await user.click(screen.getByRole("button", { name: "Baptiste" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    await screen.findByText("2ème meilleur");
    await user.click(screen.getByRole("button", { name: "Clément" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    // Next step must be Citron, NOT 3ème meilleur
    await screen.findByText("Le Citron");
    expect(screen.queryByText("3ème meilleur")).toBeNull();
  });
});
