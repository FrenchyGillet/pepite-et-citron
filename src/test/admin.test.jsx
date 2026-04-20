import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App, { __resetDemoState, __demoAPI } from "../App.jsx";

beforeEach(() => {
  __resetDemoState();
});

describe("Admin flow", () => {
  it("shows password form when not logged in", async () => {
    render(<App />);
    const user = userEvent.setup();
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("shows error on wrong password", async () => {
    render(<App />);
    const user = userEvent.setup();
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /connexion/i }));
    expect(await screen.findByText("Mot de passe incorrect.")).toBeInTheDocument();
  });

  it("shows admin UI after correct login", async () => {
    render(<App />);
    const user = userEvent.setup();
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    await user.type(screen.getByPlaceholderText("••••••••"), "hockeyadmin");
    await user.click(screen.getByRole("button", { name: /connexion/i }));
    expect(await screen.findByText("Match du jour")).toBeInTheDocument();
  });

  it("persists login via localStorage", async () => {
    localStorage.setItem("pepite_admin", "1");
    render(<App />);
    const user = userEvent.setup();
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    expect(await screen.findByText("Match du jour")).toBeInTheDocument();
  });

  it("can create a match", async () => {
    localStorage.setItem("pepite_admin", "1");
    render(<App />);
    const user = userEvent.setup();

    // Go to admin tab
    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    await screen.findByText("Match du jour");

    // Type match name
    const matchInput = screen.getByPlaceholderText(/vs Dragons/i);
    await user.type(matchInput, "Match test");

    // Select 4 players — use the first occurrence of each name (match form chips)
    const antoineBtns = screen.getAllByRole("button", { name: "Antoine" });
    await user.click(antoineBtns[0]);
    const baptisteBtns = screen.getAllByRole("button", { name: "Baptiste" });
    await user.click(baptisteBtns[0]);
    const clementBtns = screen.getAllByRole("button", { name: "Clément" });
    await user.click(clementBtns[0]);
    const davidBtns = screen.getAllByRole("button", { name: "David" });
    await user.click(davidBtns[0]);

    // Click launch button
    const launchBtn = screen.getByRole("button", { name: /Lancer le vote/i });
    await user.click(launchBtn);

    // Verify match was created via API
    const activeMatch = await __demoAPI.getActiveMatch();
    expect(activeMatch).not.toBeNull();
    expect(activeMatch.label).toBe("Match test");
  });

  it("shows guest section when match is active", async () => {
    // Create a match via API directly
    await __demoAPI.createMatch("Match actif", [1, 2, 3, 4, 5], null, 1);

    localStorage.setItem("pepite_admin", "1");
    render(<App />);
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);

    expect(await screen.findByText("Supporters invités")).toBeInTheDocument();
  });

  it("can create a guest token", async () => {
    await __demoAPI.createMatch("Match actif", [1, 2, 3, 4, 5], null, 1);

    localStorage.setItem("pepite_admin", "1");
    render(<App />);
    const user = userEvent.setup();

    const adminBtn = await screen.findByRole("button", { name: /admin/i });
    await user.click(adminBtn);
    await screen.findByText("Supporters invités");

    const guestInput = screen.getByPlaceholderText(/Prénom du supporter/i);
    await user.type(guestInput, "Tonton");
    await user.click(screen.getByRole("button", { name: /Créer/i }));

    expect(await screen.findByText("Tonton")).toBeInTheDocument();
    expect(await screen.findByText("En attente")).toBeInTheDocument();
  });
});
