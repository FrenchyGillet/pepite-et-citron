import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "../App.jsx";
import { renderApp } from "./renderApp";

beforeEach(() => {
  __resetDemoState();
});

describe("Guest token flow", () => {
  it("valid token skips step 0 and shows welcome banner", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Tonton", match.id);

    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?guest=" + token },
    });

    renderApp();

    expect(await screen.findByText(/Bienvenu\(e\), Tonton !/i)).toBeInTheDocument();
    expect(screen.queryByText("Qui es-tu ?")).toBeNull();
    // Should be at step 1 directly
    expect(await screen.findByText("La Pépite")).toBeInTheDocument();
  });

  it("invalid token shows error", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?guest=invalidtoken999" },
    });

    renderApp();

    expect(
      await screen.findByText(/Ce lien a déjà été utilisé ou n'existe pas\./i)
    ).toBeInTheDocument();
  });

  it("used/consumed token shows error", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Tonton", match.id);
    await __demoAPI.useGuestToken(token);

    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?guest=" + token },
    });

    renderApp();

    expect(
      await screen.findByText(/Ce lien a déjà été utilisé ou n'existe pas\./i)
    ).toBeInTheDocument();
  });

  it("guest completes vote and token is marked used", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    const token = await __demoAPI.createGuestToken("Tonton", match.id);

    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?guest=" + token },
    });

    renderApp();
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
    await user.click(screen.getByRole("button", { name: "Valider" }));

    // After voting, handleVoted() switches tab to "results" and handleGuestVoted marks the token
    // Wait for the results tab to appear (confirms vote flow completed)
    expect(await screen.findByText("Résultats masqués")).toBeInTheDocument();

    // Verify token is marked used
    const tokens = await __demoAPI.getGuestTokens(match.id);
    const t = tokens.find((t) => t.token === token);
    expect(t).toBeDefined();
    expect(t.used).toBe(true);
  });
});
