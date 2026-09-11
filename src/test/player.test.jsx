import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { api } from "@/api";
import { useAppStore } from "@/store/appStore";
import { renderApp } from "./renderApp";

let matchId;

beforeEach(async () => {
  __resetDemoState();
  const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
  matchId = match.id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Player voting flow", () => {
  it("shows voter name selection when match is active", async () => {
    renderApp();
    expect(await screen.findByText("Qui es-tu ?")).toBeInTheDocument();
  });

  it("a failed hasVoted check surfaces an error instead of hanging (B3)", async () => {
    vi.spyOn(api, "hasVoted").mockRejectedValueOnce(new Error("network"));

    renderApp();
    const user = userEvent.setup();

    await screen.findByText("Qui es-tu ?");
    await user.click(screen.getByRole("button", { name: "Antoine" }));

    expect(await screen.findByText(/Connexion instable/i)).toBeInTheDocument();
    // not stuck on "Vérification…": the name chips are usable again
    expect(screen.queryByText("Vérification…")).toBeNull();
    expect(screen.getByRole("button", { name: "Antoine" })).toBeEnabled();
    // still on step 0
    expect(screen.getByText("Qui es-tu ?")).toBeInTheDocument();
  });

  it("votes in 5 taps: one per choice, comments on the recap, then the verdict", async () => {
    renderApp();
    const user = userEvent.setup();

    // Tap 1 — identity: tapping your name starts the vote (no "Continuer")
    await screen.findByText("Qui es-tu ?");
    await user.click(screen.getByRole("button", { name: "Antoine" }));

    // Tap 2 — La Pépite: tapping a player moves on (no "Suivant")
    expect(await screen.findByText("La Pépite")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Baptiste" }));

    // Tap 3 — 2ème meilleur
    expect(await screen.findByText("2ème meilleur")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clément" }));

    // Tap 4 — Le Citron
    expect(await screen.findByText("Le Citron")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "David" }));

    // Recap: optional comments live here, one per choice
    expect(await screen.findByText("Récapitulatif")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suivant" })).toBeNull();
    await user.type(screen.getByRole("textbox", { name: "Commentaire sur Baptiste (optionnel)" }), "Énorme");
    expect(screen.getByText("Ton vote reste anonyme pour l'équipe.")).toBeInTheDocument();

    // Tap 5 — verdict
    await user.click(screen.getByRole("button", { name: "Rendre mon verdict →" }));

    // Stays on the confirmation (results are hidden until the reveal)
    expect(await screen.findByText(/Vote enregistré/i)).toBeInTheDocument();
    expect(screen.queryByText("Résultats masqués")).toBeNull();

    const votes = await __demoAPI.getVotes(matchId);
    const antoineVote = votes.find((v) => v.voter_name === "Antoine");
    expect(antoineVote).toBeDefined();
    expect(antoineVote.best1_id).toBe(2); // Baptiste
    expect(antoineVote.best1_comment).toBe("Énorme");
    expect(antoineVote.lemon_id).toBe(4); // David
  });

  it("going back and re-picking a pépite drops a now-duplicate later pick", async () => {
    renderApp();
    const user = userEvent.setup();

    await screen.findByText("Qui es-tu ?");
    await user.click(screen.getByRole("button", { name: "Antoine" }));
    await user.click(await screen.findByRole("button", { name: "Baptiste" }));   // pépite 1
    await screen.findByText("2ème meilleur");
    await user.click(screen.getByRole("button", { name: "Clément" }));          // pépite 2
    await screen.findByText("Le Citron");

    // Back twice, then make Clément the first pépite
    await user.click(screen.getByRole("button", { name: "Retour" }));
    await screen.findByText("2ème meilleur");
    await user.click(screen.getByRole("button", { name: "Retour" }));
    await screen.findByText("La Pépite");
    await user.click(screen.getByRole("button", { name: "Clément" }));

    // Clément can't also be 2nd: the old pick is cleared, nothing pre-selected
    await screen.findByText("2ème meilleur");
    expect(screen.queryByRole("button", { name: "Clément" })).toBeNull();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("takes the voter to the results once the reveal starts", async () => {
    await __demoAPI.submitVote({ match_id: matchId, voter_name: "Antoine", best1_id: 2, best2_id: 3, lemon_id: 4 });
    const votes = await __demoAPI.getVotes(matchId);
    await __demoAPI.startCounting(matchId, votes.map((v) => v.id));
    useAppStore.setState({ votedThisSession: true });

    renderApp({ initialPath: "/vote" });

    // Counting phase → /results, which shows the reveal header badge
    expect(await screen.findByText("Dépouillement")).toBeInTheDocument();
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

    // Step 0: tap Antoine (the check runs straight away)
    await screen.findByText("Qui es-tu ?");
    await user.click(screen.getByRole("button", { name: "Antoine" }));

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
