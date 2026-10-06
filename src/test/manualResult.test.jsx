import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { demoState } from "@/api";
import { AdminView } from "@/components/AdminView";
import { StatsView } from "@/components/StatsView";
import { renderApp } from "./renderApp";

const ORG = { id: "demo-org", name: "Demo", slug: "demo", role: "captain" };

function renderWithProviders(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  __resetDemoState();
});

describe("Saison — résultat saisi à la main", () => {
  it("adds a match played without a vote from the history", async () => {
    renderApp({ initialPath: "/stats" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Ajouter un résultat" }));
    await user.type(screen.getByLabelText(/Nom du match/), "vs Dragons");
    for (const name of ["Antoine", "Baptiste", "Clément", "David"]) {
      await user.click(screen.getByRole("button", { name }));
    }
    await user.selectOptions(screen.getByLabelText("⭐ La Pépite"), "Baptiste");
    await user.selectOptions(screen.getByLabelText("🍋 Le Citron"), "David");
    await user.click(screen.getByRole("button", { name: "Enregistrer le résultat" }));

    expect(await screen.findByText("Résultat ajouté à l’historique")).toBeInTheDocument();
    expect(demoState.matches).toHaveLength(1);
    expect(demoState.matches[0]).toMatchObject({
      label: "vs Dragons", is_open: false, phase: "closed",
      present_ids: [1, 2, 3, 4],
      manual_result: { best_ids: [2], lemon_id: 4 },
    });

    // Season titles, without points
    expect(await screen.findByText("⭐ ×1")).toBeInTheDocument();
    expect(screen.getByText("🍋 ×1")).toBeInTheDocument();
    expect(screen.getByText(/saisi à la main/)).toBeInTheDocument();
  });

  it("requires the Pépite and the Citron", async () => {
    renderApp({ initialPath: "/stats" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Ajouter un résultat" }));
    await user.type(screen.getByLabelText(/Nom du match/), "vs Lions");
    await user.click(screen.getByRole("button", { name: "Antoine" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer le résultat" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Choisis la Pépite du match.");
    expect(demoState.matches).toHaveLength(0);
  });

  it("stores the optional point totals and counts them in the season", async () => {
    renderApp({ initialPath: "/stats" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Ajouter un résultat" }));
    await user.type(screen.getByLabelText(/Nom du match/), "vs Ours");
    for (const name of ["Antoine", "Baptiste", "Clément"]) {
      await user.click(screen.getByRole("button", { name }));
    }
    await user.selectOptions(screen.getByLabelText("⭐ La Pépite"), "Antoine");
    await user.selectOptions(screen.getByLabelText("🍋 Le Citron"), "Clément");
    await user.click(screen.getByRole("button", { name: /Ajouter les points/ }));
    await user.type(screen.getByLabelText("Points Pépite de Antoine"), "11");
    await user.type(screen.getByLabelText("Points Citron de Clément"), "5");
    await user.click(screen.getByRole("button", { name: "Enregistrer le résultat" }));

    await screen.findByText("Résultat ajouté à l’historique");
    expect(demoState.matches[0].manual_result).toEqual({
      best_ids: [1], lemon_id: 3, best_pts: { "1": 11 }, lemon_pts: { "3": 5 },
    });
    expect(await screen.findByText("11")).toBeInTheDocument();
  });

  it("lets a captain edit a hand-entered result but not delete it", async () => {
    await __demoAPI.createManualMatch({
      label: "vs Loups", presentIds: [1, 2, 3], teamId: null, season: 1, pepiteCount: 2,
      playedAt: "2026-10-01T12:00:00.000Z", result: { best_ids: [1], lemon_id: 3 },
    });
    const players = await __demoAPI.getPlayers();
    renderWithProviders(
      <StatsView players={players} activeMatch={null} isAdmin={false} canRunMatches orgId="demo-org" />,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /vs Loups/ }));
    expect(screen.queryByRole("button", { name: "Supprimer" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Modifier" }));

    expect(screen.getByText("Modifier le résultat")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("⭐ La Pépite"), "Baptiste");
    await user.click(screen.getByRole("button", { name: "Enregistrer le résultat" }));

    await screen.findByText("Résultat modifié");
    expect(demoState.matches[0].manual_result).toEqual({ best_ids: [2], lemon_id: 3 });
    // date not touched → the original time is kept
    expect(demoState.matches[0].created_at).toBe("2026-10-01T12:00:00.000Z");
  });

  it("hides the entry for a plain voter", async () => {
    const players = await __demoAPI.getPlayers();
    renderWithProviders(
      <StatsView players={players} activeMatch={null} isAdmin={false} canRunMatches={false} orgId="demo-org" />,
    );
    expect(await screen.findByText("Pas encore de match")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter un résultat" })).toBeNull();
  });
});

describe("Capitaine — onglet du match", () => {
  it("shows the match of the day only: no roster, no settings", async () => {
    const players = await __demoAPI.getPlayers();
    renderWithProviders(
      <AdminView isAdmin={false} players={players} activeMatch={null} currentOrg={ORG} onShowGuide={() => {}} />,
    );
    expect(await screen.findByText("Match du soir")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lancer le vote/ })).toBeInTheDocument();
    expect(screen.queryByText("Effectif")).toBeNull();
    expect(screen.queryByText("Paramètres")).toBeNull();
  });

  it("runs an open vote without seeing who voted", async () => {
    const match = await __demoAPI.createMatch("vs Dragons", [1, 2, 3, 4], null, 1);
    const players = await __demoAPI.getPlayers();
    renderWithProviders(
      <AdminView isAdmin={false} players={players} activeMatch={match} currentOrg={ORG} onShowGuide={() => {}} />,
    );
    expect(await screen.findByRole("button", { name: /Lancer le dépouillement/ })).toBeInTheDocument();
    expect(screen.queryByText(/Qui a voté/)).toBeNull();
  });

  it("an admin still sees who voted", async () => {
    const match = await __demoAPI.createMatch("vs Dragons", [1, 2, 3, 4], null, 1);
    const players = await __demoAPI.getPlayers();
    renderWithProviders(
      <AdminView players={players} activeMatch={match} currentOrg={{ ...ORG, role: "admin" }} onShowGuide={() => {}} />,
    );
    expect(await screen.findByText(/Qui a voté/)).toBeInTheDocument();
    expect(within(document.body).getByText("Effectif")).toBeInTheDocument();
  });
});
