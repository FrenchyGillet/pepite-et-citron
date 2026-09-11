import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthView } from "@/components/AuthView";
import { NoTeamView } from "@/components/NoTeamView";
import { SetupChecklist } from "@/components/SetupChecklist";
import { GuestPromoView } from "@/components/GuestPromoView";
import { useAppStore, readPendingOrg } from "@/store/appStore";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderAuth(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthView onAuth={vi.fn()} />
    </MemoryRouter>
  );
}

describe("Auth screen entry points", () => {
  it("opens on the login form by default (existing users)", () => {
    renderAuth("/login");
    expect(screen.getByPlaceholderText("Votre mot de passe")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Créer mon compte" })).not.toBeInTheDocument();
  });

  it("?mode=signup opens straight on the signup form (landing buttons)", () => {
    renderAuth("/login?mode=signup");
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeInTheDocument();
  });

  it("?plan= remembers the Pro plan picked on the landing", () => {
    renderAuth("/login?mode=signup&plan=monthly");
    expect(sessionStorage.getItem("pepite_upgrade_intent")).toBe("monthly");
  });
});

describe("Signed in without a team (used to be a dead end)", () => {
  it("offers to create a team, retry, or sign out", () => {
    const onCreate = vi.fn(), onRetry = vi.fn(), onSignOut = vi.fn();
    render(<NoTeamView onCreate={onCreate} onRetry={onRetry} onSignOut={onSignOut} />);
    expect(screen.getByText(/ouvre le lien de vote envoyé par ton capitaine/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Créer mon équipe" }));
    fireEvent.click(screen.getByRole("button", { name: /réessayer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("Team to join after signup (?org= link)", () => {
  it("survives a reload, and is forgotten once cleared", () => {
    useAppStore.getState().setPendingOrgId("org-9");
    useAppStore.getState().setPendingOrgName("Les Lions");
    expect(readPendingOrg()).toMatchObject({ id: "org-9", name: "Les Lions" });

    useAppStore.getState().setPendingOrgId(null);
    expect(readPendingOrg()).toBeNull();
  });

  it("expires after 7 days", () => {
    useAppStore.getState().setPendingOrgId("org-9");
    const eightDays = Date.now() + 8 * 24 * 60 * 60 * 1000;
    expect(readPendingOrg(eightDays)).toBeNull();
  });

  it("'Rejoindre' after a vote opens the signup form", () => {
    function Where() { const l = useLocation(); return <div>at {l.pathname}{l.search}</div>; }
    render(
      <MemoryRouter initialEntries={["/vote"]}>
        <Routes>
          <Route path="/vote" element={<GuestPromoView canSeeResults={false} orgName="FC Test" />} />
          <Route path="/login" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Rejoindre FC Test/ }));
    expect(screen.getByText("at /login?mode=signup")).toBeInTheDocument();
  });
});

describe("Setup checklist", () => {
  const props = { orgId: "org-1", playerCount: 0, teamCount: 0, matchCount: 0, onCopiedLink: false };

  it("asks for the real minimum of 3 players and puts the first vote before sharing", () => {
    render(<SetupChecklist {...props} />);
    const labels = screen.getAllByText(/effectif|premier vote|Partager|composition/).map(el => el.textContent);
    expect(labels[0]).toMatch(/au moins 3 joueurs/);
    expect(labels[1]).toMatch(/Lancer le premier vote/);
    expect(labels[2]).toMatch(/Partager le lien/);
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("does not require a saved line-up to be complete", () => {
    render(<SetupChecklist {...props} playerCount={3} matchCount={1} onCopiedLink />);
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByText(/C'est parti/)).toBeInTheDocument();
    expect(screen.getByText("(facultatif)")).toBeInTheDocument();
  });
});
