import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoteView } from "@/components/VoteView";
import { useAppStore } from "@/store/appStore";

const players = [
  { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste", user_id: "user-2" },
  { id: 3, name: "Clément" }, { id: 4, name: "David" },
];
const match = {
  id: 50, label: "Match du 6 oct.", is_open: true, phase: "voting", present_ids: [1, 2, 3, 4],
  reveal_order: [], revealed_count: 0, season: 1, team_id: null, created_at: "2026-10-06T20:00:00Z", pepite_count: 3,
};

function renderVote() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter><QueryClientProvider client={qc}>
      <VoteView players={players} match={match} onVoted={vi.fn()} />
    </QueryClientProvider></MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ session: null });
});

describe("Vote — who is voting", () => {
  it("a signed-in member linked to a player is not asked who they are", () => {
    useAppStore.setState({ session: { user: { id: "user-2" } } });
    renderVote();
    expect(screen.queryByText("Qui es-tu ?")).toBeNull();
    expect(screen.getByText("Baptiste", { selector: "strong" })).toBeInTheDocument();
  });

  it("anyone else still picks their name", () => {
    useAppStore.setState({ session: { user: { id: "someone-else" } } });
    renderVote();
    expect(screen.getByText("Qui es-tu ?")).toBeInTheDocument();
  });
});
