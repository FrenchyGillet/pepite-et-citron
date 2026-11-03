import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { renderApp } from "./renderApp";

// Demo roster: 1 Antoine, 2 Baptiste, 3 Clément, 4 David.
beforeEach(() => {
  __resetDemoState();
});

async function openVoterEditor(user) {
  await user.click(await screen.findByRole("button", { name: /admin/i }));
  await user.click(await screen.findByRole("button", { name: /Modifier les votants/i }));
}

describe("Admin — edit voters while the vote is open", () => {
  it("removes an absent player and saves", async () => {
    const m = await __demoAPI.createMatch("org-123", "Match programmé", [1, 2, 3, 4], null, 1);
    renderApp();
    const user = userEvent.setup();
    await openVoterEditor(user);

    await user.click(screen.getByRole("button", { name: "David", pressed: true }));
    await user.click(screen.getByRole("button", { name: /Enregistrer · 3 votants/ }));

    expect(await screen.findByText("Votants mis à jour")).toBeInTheDocument();
    await waitFor(async () => expect((await __demoAPI.getMatchById(m.id)).present_ids).toEqual([1, 2, 3]));
  });

  it("keeps a player who voted or got a pépite vote, frees the citron", async () => {
    const m = await __demoAPI.createMatch("org-123", "Match actif", [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({
      match_id: m.id, voter_name: "Antoine", voter_player_id: 1,
      best1_id: 2, best2_id: 3, lemon_id: 4,
    });
    renderApp();
    const user = userEvent.setup();
    await openVoterEditor(user);

    const antoine = screen.getByRole("button", { name: "Antoine : a voté ou reçu une voix" });
    await user.click(antoine);
    expect(antoine).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "David", pressed: true })).toBeInTheDocument();
  });

  it("refuses too few voters for the mode", async () => {
    await __demoAPI.createMatch("org-123", "Match actif", [1, 2, 3], null, 1);
    renderApp();
    const user = userEvent.setup();
    await openVoterEditor(user);

    await user.click(screen.getByRole("button", { name: "Clément", pressed: true }));
    expect(screen.getByText("Il faut au moins 3 votants pour ce mode.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enregistrer/ })).toBeDisabled();
  });

  it("the demo API applies the server rules", async () => {
    const m = await __demoAPI.createMatch("org-123", "Match actif", [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({
      match_id: m.id, voter_name: "Antoine", voter_player_id: 1,
      best1_id: 2, best2_id: 3, lemon_id: 4,
    });
    await expect(__demoAPI.setMatchVoters(m.id, [2, 3, 4])).rejects.toThrow(/déjà voté/);
    await expect(__demoAPI.setMatchVoters(m.id, [1, 2, 99])).rejects.toThrow(/inconnu/);
    await __demoAPI.setMatchVoters(m.id, [1, 2, 3]);
    expect((await __demoAPI.getMatchById(m.id)).present_ids).toEqual([1, 2, 3]);
  });
});
