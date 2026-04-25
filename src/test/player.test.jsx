import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { renderApp } from "./renderApp";

let matchId;

beforeEach(async () => {
  __resetDemoState();
  const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
  matchId = match.id;
});

describe("Player voting flow", () => {
  it("shows voter name selection when match is active", async () => {
    renderApp();
    expect(await screen.findByText("Qui es-tu ?")).toBeInTheDocument();
  });

  it("completes full 4-step vote flow", async () => {
    renderApp();
    const user = userEvent.setup();

    // Step 0: select voter
    await screen.findByText("Qui es-tu ?");
    await user.click(screen.getByRole("button", { name: "Antoine" }));
    await user.click(screen.getByRole("button", { name: "Continuer" }));

    // Step 1: La Pépite
    expect(await screen.findByText("La Pépite")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Baptiste" }));
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    // Step 2: 2ème meilleur
    expect(await screen.findByText("2ème meilleur")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clément" }));
    // There may be two "Suivant" buttons (one disabled for Retour area). Click the enabled one.
    const suivantBtns = screen.getAllByRole("button", { name: "Suivant" });
    await user.click(suivantBtns[suivantBtns.length - 1]);

    // Step 3: Le Citron
    expect(await screen.findByText("Le Citron")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "David" }));
    const suivantBtns2 = screen.getAllByRole("button", { name: "Suivant" });
    await user.click(suivantBtns2[suivantBtns2.length - 1]);

    // Step 4: Récapitulatif
    expect(await screen.findByText("Récapitulatif")).toBeInTheDocument();
    // Verify selections shown
    const allText = document.body.textContent;
    expect(allText).toContain("Baptiste");
    expect(allText).toContain("Clément");
    expect(allText).toContain("David");

    await user.click(screen.getByRole("button", { name: "Valider" }));

    // After voting, handleVoted() switches tab to "results"; verify the vote was stored
    const votes = await __demoAPI.getVotes(matchId);
    const antoineVote = votes.find((v) => v.voter_name === "Antoine");
    expect(antoineVote).toBeDefined();
    expect(antoineVote.best1_id).toBe(2); // Baptiste
  });

  it("shows déjà voté when same player tries twice", async () => {
    // Pre-submit a vote for Antoine
    await __demoAPI.submitVote({
      match_id: matchId,
      voter_name: "Antoine",
      best1_id: 2,
      best2_id: 3,
      lemon_id: 4,
    });

    renderApp();
    const user = userEvent.setup();

    // Step 0: select Antoine
    await screen.findByText("Qui es-tu ?");
    await user.click(screen.getByRole("button", { name: "Antoine" }));
    await user.click(screen.getByRole("button", { name: "Continuer" }));

    expect(await screen.findByText("Tu as déjà voté pour ce match.")).toBeInTheDocument();
  });

  it("shows locked message when match not in voting phase", async () => {
    // Move match to counting phase (still open, but not voting) so getActiveMatch() returns it
    const votes = await __demoAPI.getVotes(matchId);
    await __demoAPI.startCounting(matchId, votes.map((v) => v.id));

    renderApp();

    expect(await screen.findByText(/Vote terminé/i)).toBeInTheDocument();
  });
});
