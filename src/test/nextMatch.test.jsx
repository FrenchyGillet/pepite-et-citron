import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { __resetDemoState, __demoAPI, demoState } from "@/api";
import { ResultsView } from "@/components/ResultsView";

const ORG = "demo-org";

function renderResults(props) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ResultsView isDark={false} isPro players={demoState.players} orgId={ORG} {...props} />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

async function closedMatch() {
  const match = await __demoAPI.createMatch(ORG, "Match test", [1, 2, 3, 4, 5], null, 1, 3);
  await __demoAPI.submitVote({ match_id: match.id, voter_name: "Antoine", best1_id: 2, best2_id: 3, best3_id: 5, lemon_id: 4 });
  await __demoAPI.closeMatch(match.id);
  return __demoAPI.getMatchById(match.id);
}

async function revealPodium(user) {
  await user.click(await screen.findByRole("button", { name: /Révéler le classement/i }));
}

beforeEach(() => {
  __resetDemoState();
  localStorage.clear();
});

describe("« Prochain match ? » under the podium", () => {
  it("schedules the next match in one tap, every other week", async () => {
    renderResults({ match: await closedMatch(), isAdmin: true });
    const user = userEvent.setup();
    await revealPodium(user);

    expect(await screen.findByText("📅 Prochain match ?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dans 2 semaines" }));
    expect(screen.getByRole("checkbox", { name: "Puis toutes les 2 semaines" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Programmer ce match" }));

    expect(await screen.findByText(/📅 Prochain match : /)).toBeInTheDocument();
    expect(demoState.schedules[0]).toMatchObject({ interval_weeks: 2, starts_at: null, pepite_count: 3 });
    expect(demoState.voteOpenDelay).toBe(90);
  });

  it("can be declined: no match planned (break, holidays)", async () => {
    const match = await closedMatch();
    const { unmount } = renderResults({ match, isAdmin: true });
    const user = userEvent.setup();
    await revealPodium(user);
    await user.click(await screen.findByRole("button", { name: "Pas de match prévu" }));
    expect(screen.queryByText("📅 Prochain match ?")).toBeNull();
    expect(demoState.schedules).toHaveLength(0);

    unmount();
    renderResults({ match, isAdmin: true });
    await revealPodium(user);
    expect(await screen.findByText(/Voir le classement de saison/)).toBeInTheDocument();
    expect(screen.queryByText("📅 Prochain match ?")).toBeNull();
  });

  it("an already scheduled match can be skipped from there", async () => {
    await __demoAPI.createSchedule(ORG, {
      label: null, starts_at: null, weekday: new Date(Date.now() + 2 * 86_400_000).getDay(), start_time: "20:00",
      timezone: "Europe/Brussels", team_id: null, pepite_count: 3, locale: "fr", interval_weeks: 1, first_on: null,
    });
    renderResults({ match: await closedMatch(), isAdmin: true });
    const user = userEvent.setup();
    await revealPodium(user);

    expect(await screen.findByText(/📅 Prochain match : /)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pas de match ce jour-là" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Pas de match ce jour-là" }));
    expect(await screen.findByText(/Match sauté\. Prochain :/)).toBeInTheDocument();
  });

  it("players never see it", async () => {
    renderResults({ match: await closedMatch(), isAdmin: false });
    const user = userEvent.setup();
    await revealPodium(user);
    expect(await screen.findByText(/Voir le classement de saison/)).toBeInTheDocument();
    expect(screen.queryByText("📅 Prochain match ?")).toBeNull();
  });
});
