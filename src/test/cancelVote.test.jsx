import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { renderApp } from "./renderApp";

// Demo roster: 1 Antoine, 2 Baptiste, 3 Clément, 4 David.
beforeEach(() => {
  __resetDemoState();
});

async function openVoterTracking(user) {
  await user.click(await screen.findByRole("button", { name: /admin/i }));
  await user.click(await screen.findByRole("button", { name: /Qui a voté/i }));
}

describe("Admin — cancel a vote (someone voted under another player's name)", () => {
  it("cancels the vote after confirmation and frees the player to vote again", async () => {
    const m = await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({
      match_id: m.id, voter_name: "Antoine", voter_player_id: 1,
      best1_id: 2, best2_id: 3, lemon_id: 4,
    });

    renderApp();
    const user = userEvent.setup();
    await openVoterTracking(user);

    await user.click(await screen.findByRole("button", { name: "Annuler le vote de Antoine" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Annuler le vote" }));

    expect(await screen.findByText("Vote de Antoine annulé")).toBeInTheDocument();
    expect(await __demoAPI.getVotes(m.id)).toHaveLength(0);
    expect(await __demoAPI.hasVoted(m.id, "Antoine", 1)).toBe(false);
  });

  it("keeps the vote when the admin dismisses the confirmation", async () => {
    const m = await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({
      match_id: m.id, voter_name: "Antoine", voter_player_id: 1,
      best1_id: 2, best2_id: 3, lemon_id: 4,
    });

    renderApp();
    const user = userEvent.setup();
    await openVoterTracking(user);

    await user.click(await screen.findByRole("button", { name: "Annuler le vote de Antoine" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

    expect(await __demoAPI.getVotes(m.id)).toHaveLength(1);
  });

  it("shows no cancel button for players who have not voted", async () => {
    const m = await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({
      match_id: m.id, voter_name: "Antoine", voter_player_id: 1,
      best1_id: 2, best2_id: 3, lemon_id: 4,
    });

    renderApp();
    const user = userEvent.setup();
    await openVoterTracking(user);

    expect(await screen.findByRole("button", { name: "Annuler le vote de Antoine" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler le vote de Baptiste" })).toBeNull();
  });
});
