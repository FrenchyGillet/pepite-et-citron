import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoteView } from "@/components/VoteView";
import { QuickStartView } from "@/components/QuickStartView";
import { useAppStore } from "@/store/appStore";
import { __resetDemoState, __demoAPI } from "@/api";
import { renderApp } from "./renderApp";
import { setLang } from "@/i18n";
import { humanizeError, UserError } from "@/utils/errors";
import { validateQuickStart } from "@/utils/quickStart";

const players = [
  { id: 1, name: "Antoine" }, { id: 2, name: "Baptiste" },
  { id: 3, name: "Clément" }, { id: 4, name: "David" },
];
const match = {
  id: 50, label: "Match du 6 oct.", is_open: true, phase: "voting", present_ids: [1, 2, 3, 4],
  reveal_order: [], revealed_count: 0, season: 1, team_id: null, created_at: "2026-10-06T20:00:00Z", pepite_count: 3,
};

function renderWithProviders(element) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={qc}>{element}</QueryClientProvider></MemoryRouter>);
}

beforeEach(() => {
  useAppStore.setState({ session: null, quickStartActive: false });
});

describe("English", () => {
  it("the vote screen is in English, the brand words stay French", () => {
    setLang("en");
    renderWithProviders(<VoteView players={players} match={match} onVoted={vi.fn()} />);
    expect(screen.getByText("Who are you?")).toBeInTheDocument();
    expect(screen.getByText(/Your name is only used to count the votes/)).toBeInTheDocument();
    expect(screen.queryByText("Qui es-tu ?")).toBeNull();
  });

  it("a voter switches language from the vote screen: the whole app follows, and it is remembered", async () => {
    __resetDemoState();
    await __demoAPI.createMatch("Match du soir", [1, 2, 3, 4], null, 1);
    renderApp({ initialPath: "/vote" });
    expect(await screen.findByText("Qui es-tu ?")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("Who are you?")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toHaveTextContent("Results");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("pepite_lang")).toBe("en");
  });

  it("/start validates in English", async () => {
    setLang("en");
    renderWithProviders(<QuickStartView />);
    expect(screen.getByRole("heading", { name: "Open your first vote" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Open the vote" }));
    expect(screen.getByText("Give your team a name.")).toBeInTheDocument();
    expect(screen.getByText("Add at least 3 players to open a vote.")).toBeInTheDocument();
    expect(validateQuickStart({ teamName: "", playersText: "", email: "x", password: "" }).errors.email)
      .toBe("Invalid email address.");
  });

  it("the vote screen is in Dutch too", () => {
    setLang("nl");
    renderWithProviders(<VoteView players={players} match={match} onVoted={vi.fn()} />);
    expect(screen.getByText("Wie ben jij?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nederlands" })).toHaveAttribute("aria-pressed", "true");
    expect(humanizeError(new Error("Tu as déjà voté pour ce match."))).toBe("Je hebt al gestemd voor deze match.");
  });

  it("server messages (French in the database) are shown in English", () => {
    setLang("en");
    expect(humanizeError(new Error("Tu as déjà voté pour ce match."))).toBe("You've already voted for this match.");
    expect(humanizeError(new Error("Aucun compte trouvé pour x@y.fr"))).toBe("No account found for this address.");
    expect(humanizeError(new Error("Invalid login credentials"))).toBe("Wrong email or password.");
    // Our own English messages are never mistaken for technical text.
    expect(humanizeError(new UserError("Couldn't create the team, try again."))).toBe("Couldn't create the team, try again.");
  });
});
