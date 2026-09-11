import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { renderApp } from "./renderApp";

// Demo roster: Antoine, Baptiste, Clément, David, Étienne, Florian, Guillaume,
// Hugo, Julien, Kevin.
beforeEach(() => {
  __resetDemoState();
});

async function openRoster(user) {
  renderApp({ initialPath: "/admin" });
  // On a direct /admin load the section may already be open (it starts open
  // while the roster is still loading) — only toggle it when it is closed.
  const section = await screen.findByRole("button", { name: /Effectif/ });
  if (section.getAttribute("aria-expanded") !== "true") await user.click(section);
  await screen.findByRole("textbox", { name: "Prénom du joueur" });
}

describe("Admin — roster management", () => {
  it("adds a pasted list at once and reports names already in the roster", async () => {
    const user = userEvent.setup();
    await openRoster(user);

    await user.click(screen.getByRole("button", { name: "＋ Ajouter plusieurs joueurs" }));
    await user.type(
      screen.getByRole("textbox", { name: /Prénoms à ajouter/ }),
      "Zoé{enter}Léo, antoine",
    );
    // live count: Antoine is already in the roster
    await user.click(screen.getByRole("button", { name: "Ajouter 2 joueurs" }));

    expect(await screen.findByText(/2 joueurs ajoutés · déjà dans l'effectif : Antoine/)).toBeInTheDocument();
    const names = (await __demoAPI.getPlayers()).map(p => p.name);
    expect(names).toEqual(expect.arrayContaining(["Zoé", "Léo"]));
    expect(names.filter(n => n === "Antoine")).toHaveLength(1);
  });

  it("the single field also accepts several comma-separated names", async () => {
    const user = userEvent.setup();
    await openRoster(user);

    await user.type(screen.getByRole("textbox", { name: "Prénom du joueur" }), "Zoé, Léo{enter}");
    expect(await screen.findByText("2 joueurs ajoutés")).toBeInTheDocument();
  });

  it("archives a player (out of the pickers, history kept) and reactivates them", async () => {
    const m = await __demoAPI.createMatch("Ancien match", [1, 2, 3, 4], null, 1);
    await __demoAPI.submitVote({ match_id: m.id, voter_name: "Antoine", best1_id: 2, best2_id: 3, lemon_id: 4 });
    await __demoAPI.closeMatch(m.id);

    const user = userEvent.setup();
    await openRoster(user);

    await user.click(screen.getByRole("button", { name: "Archiver Baptiste" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Archiver" }));

    expect(await screen.findByText("Baptiste archivé")).toBeInTheDocument();
    // gone from the "who's here tonight" picker…
    expect(screen.queryByRole("button", { name: "Baptiste" })).toBeNull();
    // …but still in the data, with the ballots that name him
    expect((await __demoAPI.getPlayers()).find(p => p.name === "Baptiste")?.archived_at).toBeTruthy();
    expect((await __demoAPI.getVotes(m.id))[0].best1_id).toBe(2);

    await user.click(screen.getByRole("button", { name: /Archivés · 1/ }));
    await user.click(screen.getByRole("button", { name: "Réactiver Baptiste" }));
    expect(await screen.findByText("Baptiste réactivé")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Baptiste" })).toBeInTheDocument();
  });

  it("permanent deletion is only offered for archived players, behind a warning", async () => {
    await __demoAPI.setPlayerArchived(2, true);
    const user = userEvent.setup();
    await openRoster(user);

    expect(screen.queryByRole("button", { name: /Supprimer définitivement Antoine/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Archivés · 1/ }));
    await user.click(screen.getByRole("button", { name: "Supprimer définitivement Baptiste" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/disparaîtra des matchs passés/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByText("Baptiste supprimé")).toBeInTheDocument();
    expect((await __demoAPI.getPlayers()).find(p => p.id === 2)).toBeUndefined();
  });
});
