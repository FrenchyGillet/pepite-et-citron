import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI } from "@/App.jsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { renderApp } from "./renderApp";

beforeEach(() => {
  __resetDemoState();
});

afterEach(() => vi.restoreAllMocks());

// U7: revoking a guest link is irreversible — the ✕ asks first.
describe("Guest link revoke", () => {
  async function setup() {
    const match = await __demoAPI.createMatch("Match actif", [1, 2, 3, 4], null, 1);
    await __demoAPI.createGuestToken("Tonton", match.id);
    renderApp({ initialPath: "/admin" });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Révoquer le lien de Tonton" }));
    return { user, dialog: await screen.findByRole("alertdialog") };
  }

  it("asks before revoking and keeps the link on cancel", async () => {
    const { user, dialog } = await setup();
    expect(within(dialog).getByText(/Il ne pourra plus voter avec ce lien/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "Révoquer le lien de Tonton" })).toBeInTheDocument();
  });

  it("revokes once confirmed", async () => {
    const { user, dialog } = await setup();
    await user.click(within(dialog).getByRole("button", { name: "Révoquer" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("button", { name: "Révoquer le lien de Tonton" })).not.toBeInTheDocument());
  });
});

// U8: a crash in one screen shows a readable message, not the JS error.
describe("ErrorBoundary", () => {
  function Boom() {
    throw new Error("Cannot read properties of undefined (reading 'id')");
  }

  it("hides the technical message and offers retry and reload", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary label="Test"><Boom /></ErrorBoundary>);
    expect(screen.getByText("Quelque chose a planté")).toBeInTheDocument();
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recharger" })).toBeInTheDocument();
  });
});
