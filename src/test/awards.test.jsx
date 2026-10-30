import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, demoState } from "@/api";
import { SeasonAwards } from "@/components/SeasonAwards";
import { RevealAnnouncements } from "@/components/RevealAnnouncements";
import { matchResults, monthKey, seasonTitles } from "@/utils/awards";

const players = [1, 2, 3, 4].map(id => ({ id, name: ["Ana", "Ben", "Cid", "Dan"][id - 1] }));
let voteId = 1;

/** A revealed 2-pépite match; each ballot = [best1, best2, lemon]. */
function revealed(id, daysAgo, ballots) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const votes = ballots.map(([b1, b2, l]) => ({ id: voteId++, match_id: id, voter_name: "x", best1_id: b1, best2_id: b2, lemon_id: l }));
  return {
    match: {
      id, label: `M${id}`, is_open: false, phase: "closed", present_ids: [1, 2, 3, 4],
      reveal_order: votes.map(v => v.id), revealed_count: votes.length, season: 1, team_id: null,
      created_at: d.toISOString(), pepite_count: 2,
    },
    votes,
  };
}

const wrap = (el) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={qc}>{el}</QueryClientProvider></MemoryRouter>);
};

// Ana wins the last three matches; Dan is the citron of the last two.
const M1 = revealed(1, 2, [[1, 2, 3], [1, 3, 4], [1, 2, 3]]);
const M2 = revealed(2, 1, [[1, 2, 4], [1, 3, 4]]);
const M3 = revealed(3, 0, [[1, 2, 4], [1, 2, 4], [2, 1, 4], [1, 4, 3]]);

beforeEach(() => {
  __resetDemoState();
  demoState.players = players;
});

/** SeasonAwards as StatsView renders it. */
const awards = (matches, votes) => {
  const results = matchResults(players, matches, votes);
  return <SeasonAwards players={players} results={results} season={seasonTitles(results)} />;
};

describe("Saison → Palmarès", () => {
  it("titles of the season up front, the month, streaks and records folded", async () => {
    const ms = [M1, M2, M3];
    wrap(awards(ms.map(x => x.match), ms.flatMap(x => x.votes)));
    expect(screen.getByText("Palmarès")).toBeInTheDocument();
    expect(screen.getByText("🏆 Pépite de la saison").nextSibling).toHaveTextContent("Ana");
    expect(screen.getByText("🍋 Citron de la saison").nextSibling).toHaveTextContent("Dan");
    // Pépite or Citron comments a running streak or the season record.
    const mascot = screen.getAllByRole("img", { name: /^(Pépite|Citron)$/ })[0];
    expect(mascot.parentElement).toHaveTextContent(/3e pépite|3 pépites|3 d'affilée|2e citron|caractère|record/);

    expect(screen.queryByText("🔥 Ana : 3 pépites d’affilée")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Plus de palmarès" }));
    expect(screen.getByText("🔥 Ana : 3 pépites d’affilée")).toBeInTheDocument();
    expect(screen.getByText("🍋 Dan : 2 citrons d’affilée")).toBeInTheDocument();
    expect(screen.getByText("Plus gros score : Ana, 7 pts (M3)")).toBeInTheDocument();
    // The three matches fall in this month unless today is the 1st or 2nd.
    if (ms.every(x => monthKey(new Date(x.match.created_at)) === monthKey(new Date()))) {
      expect(screen.getByText("⭐ Pépite du mois").nextSibling).toHaveTextContent("Ana");
    }
  });

  it("waits for 2 revealed matches", () => {
    wrap(awards([M1.match, { ...M2.match, reveal_order: [] }], [...M1.votes, ...M2.votes]));
    expect(screen.getByText("Le palmarès apparaît dès 2 matchs dévoilés.")).toBeInTheDocument();
  });
});

describe("Résultats → Les faits du match", () => {
  it("announces the streaks and the record of the match just revealed", async () => {
    demoState.matches = [M1.match, M2.match];
    demoState.votes = [...M1.votes, ...M2.votes, ...M3.votes];
    wrap(<RevealAnnouncements match={M3.match} players={players} />);
    expect(await screen.findByText("🏅 Les faits du match")).toBeInTheDocument();
    expect(screen.getByText("🔥 Ana : 3e pépite d’affilée !")).toBeInTheDocument();
    expect(screen.getByText("🍋 Dan : 2e citron d’affilée, abonné !")).toBeInTheDocument();
    expect(screen.getByText("📈 Record de la saison : 7 pts pour Ana")).toBeInTheDocument();
  });

  it("says nothing when there is nothing to say", async () => {
    demoState.matches = [];
    demoState.votes = [...M1.votes];
    const { container } = wrap(<RevealAnnouncements match={M1.match} players={players} />);
    await new Promise(r => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
