import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { AuthView } from "@/components/AuthView";
import { renderApp } from "./renderApp";

// Accessibility contract: fields are reachable by their label, icon-only
// controls have a name, and state is exposed (current tab, expanded sections).
beforeEach(() => {
  __resetDemoState();
});

describe("Accessibility — names and labels", () => {
  it("login fields are labelled", () => {
    render(<AuthView onAuth={vi.fn()} />);
    expect(screen.getByLabelText("Adresse email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("type", "password");
  });

  it("the theme toggle has an accessible name", async () => {
    renderApp({ initialPath: "/vote" });
    expect(await screen.findByRole("button", { name: /Passer en thème (clair|sombre)/ })).toBeInTheDocument();
  });

  it("the tab bar marks the current page", async () => {
    renderApp({ initialPath: "/vote" });
    const nav = await screen.findByRole("navigation", { name: "Navigation principale" });
    const current = nav.querySelector('[aria-current="page"]');
    expect(current).toHaveTextContent("Vote");
  });

  it("admin match form: the match name field is labelled", async () => {
    renderApp({ initialPath: "/admin" });
    expect(await screen.findByLabelText("Nom du match ou de l'adversaire")).toBeInTheDocument();
  });

  it("collapsible admin sections expose their state", async () => {
    renderApp({ initialPath: "/admin" });
    const user = userEvent.setup();
    const settings = await screen.findByRole("button", { name: /Paramètres/ });
    expect(settings).toHaveAttribute("aria-expanded", "false");
    await user.click(settings);
    expect(settings).toHaveAttribute("aria-expanded", "true");
  });

  it("the guest-link revoke button names the guest", async () => {
    const match = await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1);
    await __demoAPI.createGuestToken("Tonton", match.id);
    renderApp({ initialPath: "/admin" });
    expect(await screen.findByRole("button", { name: "Révoquer le lien de Tonton" })).toBeInTheDocument();
  });
});
