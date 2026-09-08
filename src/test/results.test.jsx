import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { ResultsView } from "@/components/ResultsView";
import { renderApp } from "./renderApp";

/** Render ResultsView in isolation (needed to exercise isAdmin=false). */
function renderResults(props) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ResultsView isDark={false} {...props} />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  __resetDemoState();
});

describe("Results view phases", () => {
  it("voting phase shows masked results", async () => {
    await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);

    renderApp();
    const user = userEvent.setup();

    const resultsBtn = await screen.findByRole("button", { name: /résultats/i });
    await user.click(resultsBtn);

    expect(await screen.findByText("Résultats masqués")).toBeInTheDocument();
  });

  it("counting phase shows reveal interface", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);

    // Submit 1 vote
    await __demoAPI.submitVote({
      match_id: match.id,
      voter_name: "Antoine",
      best1_id: 2,
      best2_id: 3,
      lemon_id: 4,
    });

    // Get votes and start counting
    const votes = await __demoAPI.getVotes(match.id);
    await __demoAPI.startCounting(match.id, votes.map((v) => v.id));

    renderApp();
    const user = userEvent.setup();

    const resultsBtn = await screen.findByRole("button", { name: /résultats/i });
    await user.click(resultsBtn);

    expect(await screen.findByText("Dépouillement")).toBeInTheDocument();
    expect(await screen.findByText(/Vote 1 \/ 1/i)).toBeInTheDocument();
  });

  it("counting: admin can reveal next vote and scoreboard updates", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);

    // Submit 1 vote: Antoine votes Baptiste as best
    await __demoAPI.submitVote({
      match_id: match.id,
      voter_name: "Antoine",
      best1_id: 2, // Baptiste
      best2_id: 3, // Clément
      lemon_id: 4, // David
    });

    const votes = await __demoAPI.getVotes(match.id);
    await __demoAPI.startCounting(match.id, votes.map((v) => v.id));

    renderApp();
    const user = userEvent.setup();

    const resultsBtn = await screen.findByRole("button", { name: /résultats/i });
    await user.click(resultsBtn);

    await screen.findByText("Dépouillement");

    // Click "Voir le classement final →" (only 1 vote so this is the last)
    const nextBtn = await screen.findByRole("button", {
      name: /Voir le classement final →/i,
    });
    await user.click(nextBtn);

    // Baptiste should appear in the running scoreboard
    expect(await screen.findByText("Baptiste")).toBeInTheDocument();
  });

  it("counting: 3-pépite mode shows the 3-2-1 scale and the 3rd pick (B5)", async () => {
    const match = await __demoAPI.createMatch("Match 3 pépites", [1, 2, 3, 4, 5], null, 1, 3);
    await __demoAPI.submitVote({
      match_id: match.id,
      voter_name: "Antoine",
      best1_id: 2, // Baptiste
      best2_id: 3, // Clément
      best3_id: 5, // Étienne
      lemon_id: 4, // David
    });
    const votes = await __demoAPI.getVotes(match.id);
    await __demoAPI.startCounting(match.id, votes.map((v) => v.id));

    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /résultats/i }));
    await screen.findByText("Dépouillement");

    expect(await screen.findByText("La Pépite · 3 pts")).toBeInTheDocument();
    expect(screen.getByText("2ème · 2 pts")).toBeInTheDocument();
    expect(screen.getByText("3ème · 1 pt")).toBeInTheDocument();
    expect(screen.getByText("Étienne")).toBeInTheDocument();
  });

  it("counting: an unknown vote id in reveal_order never blocks the dépouillement (B6)", async () => {
    const match = await __demoAPI.createMatch("Match test", [1, 2, 3, 4, 5], null, 1);
    // reveal_order points at a vote that does not exist
    await __demoAPI.startCounting(match.id, [999]);

    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /résultats/i }));
    await screen.findByText("Dépouillement");

    expect(await screen.findByText(/Ce vote n'est plus disponible/i)).toBeInTheDocument();
    // the advance button still works → dépouillement can finish
    await user.click(await screen.findByRole("button", { name: /classement final/i }));
    expect(await screen.findByText(/Tous les votes ont été révélés/i)).toBeInTheDocument();
  });

  it("counting: a non-admin watcher gets a status view, no reveal controls", async () => {
    const players = [
      { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste" },
      { id: 3, name: "Clément" }, { id: 4, name: "David" }, { id: 5, name: "Étienne" },
    ];
    const match = {
      id: 1, label: "Match test", is_open: false, phase: "counting",
      present_ids: [1, 2, 3, 4, 5], reveal_order: [10, 11, 12], revealed_count: 1,
      season: 1, team_id: null, created_at: "2026-01-01T00:00:00Z", pepite_count: 2,
    };

    renderResults({ players, match, isAdmin: false });

    expect(await screen.findByText(/Dépouillement en cours/i)).toBeInTheDocument();
    expect(screen.getByText(/Vote 1 \/ 3 révélé par l/i)).toBeInTheDocument();
    // no reveal controls for a watcher
    expect(screen.queryByRole("button", { name: /vote suivant/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /classement final/i })).toBeNull();
  });
});
