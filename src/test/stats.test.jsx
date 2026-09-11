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
