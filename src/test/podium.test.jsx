import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PodiumView } from "@/components/PodiumView";

// B10 — a tie at the top must never crown an arbitrary (alphabetical) player.
const alice   = { id: 1, name: "Alice" };
const bob     = { id: 2, name: "Bob" };
const charlie = { id: 3, name: "Charlie" };
const present = [alice, bob, charlie];

// Alice 2+1 = 3 pts, Bob 1+2 = 3 pts → tied for the Pépite.
const tiedVotes = [
  { id: 1, match_id: 1, voter_name: "V1", best1_id: 1, best2_id: 2, lemon_id: 3 },
  { id: 2, match_id: 1, voter_name: "V2", best1_id: 2, best2_id: 1, lemon_id: 3 },
];

describe("PodiumView — ties (B10)", () => {
  it("shows both ex-aequo together on the top step while the tie is open", () => {
    render(<PodiumView votes={tiedVotes} present={present} allPlayers={present} />);

    expect(screen.getByText("Ex-aequo")).toBeInTheDocument();
    expect(screen.getByText("Alice & Bob")).toBeInTheDocument();
    // one crown, on the shared top step — not on Alice alone
    expect(screen.getAllByText("👑")).toHaveLength(1);
  });

  it("crowns the admin's tiebreaker winner alone once the tie is broken", () => {
    render(<PodiumView votes={tiedVotes} present={present} allPlayers={present} tiebreakers={{ best_id: 2 }} />);

    expect(screen.queryByText("Ex-aequo")).toBeNull();
    expect(screen.queryByText("Alice & Bob")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("a clear winner stands alone; a tie lower down is shown as ex-aequo on that step", () => {
    // Alice 2+2 = 4 pts; Bob 1 pt, Charlie 1 pt → tied for 2nd.
    const votes = [
      { id: 1, match_id: 1, voter_name: "V1", best1_id: 1, best2_id: 2, lemon_id: 3 },
      { id: 2, match_id: 1, voter_name: "V2", best1_id: 1, best2_id: 3, lemon_id: 2 },
    ];
    render(<PodiumView votes={votes} present={present} allPlayers={present} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob & Charlie")).toBeInTheDocument();
    expect(screen.getAllByText("Ex-aequo")).toHaveLength(1);
    expect(screen.getAllByText("👑")).toHaveLength(1);
  });
});
