import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { useAppStore } from "@/store/appStore";
import { renderApp } from "./renderApp";

// Demo roster: 1 Antoine, 2 Baptiste, 3 Clément, 4 David. Demo org slug: "demo".
const inMinutes = (m) => new Date(Date.now() + m * 60_000).toISOString();

beforeEach(() => {
  __resetDemoState();
});

afterEach(() => {
  delete navigator.share;
});

describe("F1 — vote deadline", () => {
  it("the admin picks a duration when opening the vote and sees the countdown", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));
    await screen.findByText("Match du soir");

    await user.type(screen.getByPlaceholderText(/vs Dragons/i), "Match test");
    for (const name of ["Antoine", "Baptiste", "Clément"]) {
      await user.click(screen.getAllByRole("button", { name })[0]);
    }
    await user.click(screen.getByRole("button", { name: "30 min" }));
    expect(screen.getByRole("button", { name: "30 min" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /Lancer le vote/i }));

    const match = await __demoAPI.getActiveMatch();
    const minutesLeft = (new Date(match.vote_deadline).getTime() - Date.now()) / 60_000;
    expect(minutesLeft).toBeGreaterThan(29);
    expect(minutesLeft).toBeLessThanOrEqual(30);
    expect(await screen.findByText(/Fermeture dans 30 min/)).toBeInTheDocument();
  });

  it("opens without a deadline by default", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /admin/i }));
    await screen.findByText("Match du soir");
    await user.type(screen.getByPlaceholderText(/vs Dragons/i), "Match test");
    for (const name of ["Antoine", "Baptiste", "Clément"]) {
      await user.click(screen.getAllByRole("button", { name })[0]);
    }
    await user.click(screen.getByRole("button", { name: /Lancer le vote/i }));
    await screen.findByText("Match ouvert !");
    expect((await __demoAPI.getActiveMatch()).vote_deadline).toBeNull();
    expect(screen.queryByText(/Fermeture dans/)).not.toBeInTheDocument();
  });

  it("the admin can push the deadline back by 15 minutes", async () => {
    await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1, 2, inMinutes(10));
    renderApp({ initialPath: "/admin" });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "+15 min" }));
    expect(await screen.findByText(/Fermeture dans 25 min/)).toBeInTheDocument();
  });

  it("voters see the countdown while the vote is open", async () => {
    await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1, 2, inMinutes(45));
    renderApp();
    expect(await screen.findByText(/Fermeture dans 45 min/)).toBeInTheDocument();
  });

  it("voters see a closed vote once the deadline has passed, and the ballot is refused", async () => {
    const m = await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1, 2, inMinutes(-1));
    renderApp();
    expect(await screen.findByText(/Le vote a fermé à/)).toBeInTheDocument();
    expect(screen.queryByText("Qui es-tu ?")).not.toBeInTheDocument();

    await expect(__demoAPI.submitVote({
      match_id: m.id, voter_name: "Antoine", voter_player_id: 1, best1_id: 2, best2_id: 3, lemon_id: 4,
    })).rejects.toThrow(/heure limite/);
  });
});

describe("F1 — remind players who have not voted", () => {
  // Demo mode has no current org; the reminder needs its slug for the vote link.
  beforeEach(() => {
    useAppStore.setState({ currentOrg: { id: "demo-org", name: "Demo", slug: "demo", role: "admin" } });
  });

  it("shares a message listing the missing voters with the vote link", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    navigator.share = share;
    const m = await __demoAPI.createMatch("vs Dragons", [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({
      match_id: m.id, voter_name: "Antoine", voter_player_id: 1, best1_id: 2, best2_id: 3, lemon_id: 4,
    });

    renderApp({ initialPath: "/admin" });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "⏰ Relancer les retardataires (3)" }));

    expect(share).toHaveBeenCalledTimes(1);
    const { text } = share.mock.calls[0][0];
    expect(text).toContain("vs Dragons : il manque encore les votes de Baptiste, Clément et David.");
    expect(text).toContain("/vote?org=demo");
    expect(text).not.toContain("Antoine");
  });

  it("copies the message when the share sheet is unavailable", async () => {
    await __demoAPI.createMatch("vs Dragons", [1, 2, 3, 4], null, 1);

    renderApp({ initialPath: "/admin" });
    const user = userEvent.setup(); // installs a clipboard stub
    await user.click(await screen.findByRole("button", { name: /Relancer les retardataires \(4\)/ }));

    expect(await screen.findByText(/Message copié/)).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toContain("Antoine, Baptiste, Clément et David");
  });

  it("hides the reminder once everyone has voted", async () => {
    const m = await __demoAPI.createMatch("vs Dragons", [1, 2, 3], null, 1);
    for (const [id, name, b1, b2, l] of [[1, "Antoine", 2, 3, 4], [2, "Baptiste", 1, 3, 4], [3, "Clément", 1, 2, 4]]) {
      await __demoAPI.submitVote({ match_id: m.id, voter_name: name, voter_player_id: id, best1_id: b1, best2_id: b2, lemon_id: l });
    }
    renderApp({ initialPath: "/admin" });
    await screen.findByRole("button", { name: /Lancer le dépouillement · 3 votes/ });
    expect(screen.queryByRole("button", { name: /Relancer les retardataires/ })).not.toBeInTheDocument();
  });
});
