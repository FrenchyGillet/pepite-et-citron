import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState } from "@/App.jsx";
import { api } from "@/api";
import { renderApp } from "./renderApp";

beforeEach(() => {
  __resetDemoState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Saison — loading failures", () => {
  it("shows an error with a retry instead of an empty season when the load fails", async () => {
    const spy = vi.spyOn(api, "getMatches").mockRejectedValueOnce(new Error("Délai dépassé"));

    renderApp({ initialPath: "/stats" });

    expect(await screen.findByText("Impossible de charger la saison")).toBeInTheDocument();
    expect(screen.queryByText("Pas encore de match")).toBeNull();

    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    // demo org has no matches yet → the real empty state once the retry succeeds
    expect(await screen.findByText("Pas encore de match")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("Saison — export CSV (Pro)", () => {
  it("downloads the season rankings as a spreadsheet", async () => {
    const { __demoAPI } = await import("@/App.jsx");
    await __demoAPI.createManualMatch("demo-org", {
      label: "vs Dragons", presentIds: [1, 2, 3, 4], teamId: null, season: 1, pepiteCount: 2,
      playedAt: new Date().toISOString(),
      result: { best_ids: [2], lemon_id: 4, best_pts: { 2: 5 }, lemon_pts: { 4: 3 } },
    });
    let exported;
    URL.createObjectURL = vi.fn((file) => { exported = file; return "blob:csv"; });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderApp({ initialPath: "/stats" });
    await userEvent.setup().click(await screen.findByRole("button", { name: "Exporter le classement de la saison (CSV)" }));

    expect(click).toHaveBeenCalled();
    expect(exported.name).toBe("pepite-citron-saison-1.csv");
    const lines = (await exported.text()).replace(/^\uFEFF/, "").split("\r\n");
    expect(lines[0]).toBe("Joueur;Matchs joués;Absences;Points pépite;Pépites;Points citron;Citrons");
    expect(lines).toContain("Baptiste;1;0;5;1;0;0");
    expect(lines).toContain("David;1;0;0;0;3;1");
  });
});
