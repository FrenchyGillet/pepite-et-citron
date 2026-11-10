import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { renderApp } from "./renderApp";

// Demo roster: 1 Antoine, 2 Baptiste, 3 Clément, 4 David.
let matchId;

beforeEach(async () => {
  __resetDemoState();
  const m = await __demoAPI.createMatch("org-123", "Match actif", [1, 2, 3, 4], null, 1);
  matchId = m.id;
  // Someone tapped Antoine's name before Antoine did.
  await __demoAPI.submitVote({
    match_id: matchId, voter_name: "Antoine", voter_player_id: 1,
    best1_id: 2, best2_id: 3, lemon_id: 4,
  });
});

describe("« Ce n'était pas moi »", () => {
  it("lets the player flag the vote cast under their name", async () => {
    renderApp();
    const user = userEvent.setup();

    await screen.findByText("Qui es-tu ?");
    await user.click(screen.getByRole("button", { name: "Antoine" }));
    expect(await screen.findByText("Tu as déjà voté pour ce match.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ce n'était pas moi" }));

    expect(await screen.findByText(/C'est signalé aux admins/)).toBeInTheDocument();
    const [vote] = await __demoAPI.getVotes(matchId);
    expect(vote.disputed_at).toBeTruthy();
  });

  it("warns the admin, who cancels the vote so the player can vote", async () => {
    await __demoAPI.reportVoteDispute(matchId, 1);

    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Antoine dit ne pas avoir voté");
    await user.click(within(alert).getByRole("button", { name: "Annuler le vote de Antoine" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Annuler le vote" }));

    expect(await screen.findByText("Vote de Antoine annulé")).toBeInTheDocument();
    expect(await __demoAPI.hasVoted(matchId, "Antoine", 1)).toBe(false);
  });

  it("is refused once the vote is closed", async () => {
    const votes = await __demoAPI.getVotes(matchId);
    await __demoAPI.startCounting(matchId, votes.map((v) => v.id));
    await expect(__demoAPI.reportVoteDispute(matchId, 1)).rejects.toThrow("clôturé");
  });
});
