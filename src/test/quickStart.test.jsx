import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI, demoState } from "@/api";
import { QuickStartView } from "@/components/QuickStartView";
import { AuthView } from "@/components/AuthView";
import { AdminView } from "@/components/AdminView";
import { useAppStore } from "@/store/appStore";

function AdminProbe() {
  const { state } = useLocation();
  return <div>admin {state?.firstVote ? "first vote" : ""}</div>;
}

function StartProbe() {
  return <div>start screen</div>;
}

function renderAt(path, element, { startElement = element } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/start" element={startElement} />
          <Route path="/login" element={element} />
          <Route path="/admin" element={<AdminProbe />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  __resetDemoState();
  localStorage.clear();
  sessionStorage.clear();
  useAppStore.setState({ session: null, currentOrg: null, myOrgs: [], quickStartActive: false, pendingOrgId: null });
});

describe("/start — premier vote en une minute", () => {
  it("creates everything from one screen and lands on the open vote", async () => {
    renderAt("/start", <QuickStartView />);
    const user = userEvent.setup();

    // Pépite and Citron: one bubble reacting to the organiser (the slot also
    // lays the intro out hidden, to keep its height).
    const bubble = (text) => screen.queryAllByText(text).filter(el => !el.closest('[aria-hidden="true"]'));
    expect(bubble("Ce soir, quelqu'un devient une légende.")).toHaveLength(1);
    await user.type(screen.getByLabelText("Nom de l'équipe"), "FC Lions");
    await user.type(screen.getByLabelText("Les joueurs"), "Zoé\nYann\nXavier\nWilly");
    expect(screen.getByText("4 joueurs · vote à 3 pépites + 1 citron")).toBeInTheDocument();
    expect(bubble("Ce soir, quelqu'un devient une légende.")).toHaveLength(0);
    expect(bubble(/^4 joueurs\. (3 pépites, un citron|Une équipe magnifique)/)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Yann" }));
    await user.type(screen.getByLabelText("Adresse email"), "coach@club.fr");
    expect(bubble(/^Toi, tu as un compte\./)).toHaveLength(1);
    expect(bubble(/^4 joueurs\. (3 pépites, un citron|Une équipe magnifique)/)).toHaveLength(0);
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.click(screen.getByRole("button", { name: "Lancer le vote · 4 joueurs" }));

    expect(await screen.findByText("admin first vote")).toBeInTheDocument();
    expect(demoState.matches).toHaveLength(1);
    expect(demoState.matches[0]).toMatchObject({ phase: "voting", pepite_count: 3 });
    expect(demoState.matches[0].present_ids).toHaveLength(4);
    const { currentOrg, quickStartActive } = useAppStore.getState();
    expect(currentOrg).toMatchObject({ name: "FC Lions", role: "admin" });
    expect(quickStartActive).toBe(false);
    // "Voter moi aussi" opens on Yann's ballot
    expect(JSON.parse(localStorage.getItem("pepite_voter_identity"))).toMatchObject({ name: "Yann" });
    // No guide modal on top of the open vote
    expect(localStorage.getItem(`pepite_onboarded_${currentOrg.id}`)).toBe("1");
  });

  it("shows every missing field and creates nothing", async () => {
    const signUp = vi.spyOn(__demoAPI, "signUp");
    renderAt("/start", <QuickStartView />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Les joueurs"), "Zoé, Yann");
    await user.click(screen.getByRole("button", { name: "Lancer le vote" }));

    expect(screen.getByText("Donne un nom à ton équipe.")).toBeInTheDocument();
    expect(screen.getByText("Ajoute au moins 3 joueurs pour lancer un vote.")).toBeInTheDocument();
    expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument();
    expect(screen.getByText("Au moins 8 caractères.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("keeps the form and says the account exists when a step fails", async () => {
    vi.spyOn(__demoAPI, "createMatch").mockRejectedValueOnce(new Error("Délai dépassé"));
    renderAt("/start", <QuickStartView />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nom de l'équipe"), "FC Lions");
    await user.type(screen.getByLabelText("Les joueurs"), "Zoé\nYann\nXavier");
    await user.type(screen.getByLabelText("Adresse email"), "coach@club.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.click(screen.getByRole("button", { name: /Lancer le vote/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/réessaie, on reprend/);
    await user.click(screen.getByRole("button", { name: /Lancer le vote/ }));
    expect(await screen.findByText("admin first vote")).toBeInTheDocument();
    expect(demoState.matches).toHaveLength(1);
  });

  it("remembers the Pro plan picked on the landing", () => {
    renderAt("/start?plan=monthly", <QuickStartView />);
    expect(sessionStorage.getItem("pepite_upgrade_intent")).toBe("monthly");
  });
});

describe("Signup form", () => {
  it("'Créer un compte' sends team creators to /start", async () => {
    renderAt("/login", <AuthView onAuth={vi.fn()} />, { startElement: <StartProbe /> });
    await userEvent.setup().click(screen.getByRole("button", { name: "Créer un compte" }));
    expect(screen.getByText("start screen")).toBeInTheDocument();
  });

  it("keeps the signup form for a voter joining their team", async () => {
    useAppStore.setState({ pendingOrgId: "org-9" });
    renderAt("/login", <AuthView onAuth={vi.fn()} />, { startElement: <StartProbe /> });
    await userEvent.setup().click(screen.getByRole("button", { name: "Créer un compte" }));
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeInTheDocument();
  });
});

describe("/start once signed in", () => {
  it("asks no email or password and opens the vote", async () => {
    const signUp = vi.spyOn(__demoAPI, "signUp");
    useAppStore.setState({ session: { user: { id: "u1", email: "coach@club.fr" } } });
    renderAt("/start", <QuickStartView onSignOut={vi.fn()} />);
    const user = userEvent.setup();

    expect(screen.queryByLabelText("Adresse email")).toBeNull();
    expect(screen.queryByLabelText("Mot de passe")).toBeNull();
    expect(screen.getByText(/Connecté avec coach@club.fr/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nom de l'équipe"), "FC Lions");
    await user.type(screen.getByLabelText("Les joueurs"), "Zoé\nYann\nXavier");
    await user.click(screen.getByRole("button", { name: /Lancer le vote/ }));

    expect(await screen.findByText("admin first vote")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
    expect(demoState.matches).toHaveLength(1);
  });

  it("keeps the user's other teams when adding one", async () => {
    const usual = { id: "org-1", name: "Les Anciens", slug: "anciens", role: "admin" };
    useAppStore.setState({ session: { user: { id: "u1" } }, myOrgs: [usual], currentOrg: usual });
    renderAt("/start", <QuickStartView />);
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "← Retour" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nom de l'équipe"), "FC Lions");
    await user.type(screen.getByLabelText("Les joueurs"), "Zoé\nYann\nXavier");
    await user.click(screen.getByRole("button", { name: /Lancer le vote/ }));

    expect(await screen.findByText("admin first vote")).toBeInTheDocument();
    const { myOrgs, currentOrg } = useAppStore.getState();
    expect(myOrgs.map(o => o.name)).toEqual(["Les Anciens", "FC Lions"]);
    expect(currentOrg).toMatchObject({ name: "FC Lions", role: "admin" });
  });
});

describe("/start draft", () => {
  it("comes back filled in after confirming the email, and is gone once the vote is open", async () => {
    vi.spyOn(__demoAPI, "getSession").mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const { unmount } = renderAt("/start", <QuickStartView />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nom de l'équipe"), "FC Lions");
    await user.type(screen.getByLabelText("Les joueurs"), "Zoé\nYann\nXavier");
    await user.click(screen.getByRole("button", { name: "Yann" }));
    await user.type(screen.getByLabelText("Adresse email"), "coach@club.fr");
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse");
    await user.click(screen.getByRole("button", { name: /Lancer le vote/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/confirme ton adresse email/);
    unmount();

    // Signed in after confirming: same screen, nothing to type again.
    useAppStore.setState({ session: { user: { id: "u1", email: "coach@club.fr" } }, quickStartActive: false });
    renderAt("/start", <QuickStartView />);
    expect(screen.getByLabelText("Nom de l'équipe")).toHaveValue("FC Lions");
    expect(screen.getByRole("button", { name: "Yann" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /Lancer le vote/ }));
    expect(await screen.findByText("admin first vote")).toBeInTheDocument();
    expect(localStorage.getItem("pepite_quick_start_draft")).toBeNull();
  });
});

describe("Vote ouvert après /start", () => {
  it("shows the welcome and the QR code straight away", async () => {
    const match = await __demoAPI.createMatch('org-123', "Match du 6 oct.", [1, 2, 3, 4], null, 1, 3);
    const players = await __demoAPI.getPlayers('org-123');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={[{ pathname: "/admin", state: { firstVote: true } }]}>
        <QueryClientProvider client={queryClient}>
          <AdminView players={players} activeMatch={match} currentOrg={{ id: "demo-org", name: "Demo", slug: "demo", role: "admin" }} onShowGuide={() => {}} />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText("🎉 Ton premier vote est ouvert !")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code du lien de vote" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Voter moi aussi/ })).toBeInTheDocument();
  });
});
