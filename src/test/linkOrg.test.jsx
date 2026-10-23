import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api";
import { useAppStore } from "@/store/appStore";
import { LinkOrgBanner, JoinLinkOrgOffer } from "@/components/LinkOrgBanner";
import { getStoredVoterIdentity, saveVoterIdentity } from "@/utils/vote";

const TEAM_A = { id: "org-a", name: "FC A", slug: "fc-a", role: "admin", plan: "free" };
const TEAM_B = { id: "org-b", name: "FC B", slug: "fc-b", plan: "free" };
const SESSION = { user: { id: "u1", email: "a@b.c" } };

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Vote link of another team while signed in", () => {
  it("the link's team wins when the user's teams load after the link", async () => {
    vi.spyOn(api, "getMyOrgs").mockResolvedValue([TEAM_A]);
    useAppStore.getState().openLinkOrg(TEAM_B);

    await useAppStore.getState().loadOrgs();

    const { currentOrg, usualOrg } = useAppStore.getState();
    expect(currentOrg).toMatchObject({ id: "org-b", role: null });
    expect(usualOrg).toMatchObject({ id: "org-a" });
  });

  it("the link's team wins when it resolves after the user's teams", async () => {
    vi.spyOn(api, "getMyOrgs").mockResolvedValue([TEAM_A]);
    await useAppStore.getState().loadOrgs();
    useAppStore.setState({ lastMatchId: 42, votedThisSession: true });

    useAppStore.getState().openLinkOrg(TEAM_B);

    const s = useAppStore.getState();
    expect(s.currentOrg).toMatchObject({ id: "org-b", role: null });
    expect(s.usualOrg).toMatchObject({ id: "org-a" });
    // nothing of team A's match leaks into team B's vote screen
    expect(s.lastMatchId).toBeNull();
    expect(s.votedThisSession).toBe(false);
  });

  it("the next launch without a link opens the usual team again", async () => {
    vi.spyOn(api, "getMyOrgs").mockResolvedValue([TEAM_A]);
    useAppStore.getState().openLinkOrg(TEAM_B);
    await useAppStore.getState().loadOrgs();

    useAppStore.getState().clearLinkOrg();
    useAppStore.setState({ currentOrg: null });
    await useAppStore.getState().loadOrgs();

    expect(useAppStore.getState().currentOrg).toMatchObject({ id: "org-a", role: "admin" });
  });

  it("keeps the member role when the link is one of the user's own teams", async () => {
    vi.spyOn(api, "getMyOrgs").mockResolvedValue([TEAM_A, { ...TEAM_B, role: "voter" }]);
    useAppStore.getState().openLinkOrg(TEAM_B);
    await useAppStore.getState().loadOrgs();

    expect(useAppStore.getState().currentOrg).toMatchObject({ id: "org-b", role: "voter" });
  });

  it("a user without any team still votes for the link's team", async () => {
    vi.spyOn(api, "getMyOrgs").mockResolvedValue([]);
    useAppStore.getState().openLinkOrg(TEAM_B);
    await useAppStore.getState().loadOrgs();

    expect(useAppStore.getState().currentOrg).toMatchObject({ id: "org-b", role: null });
    expect(useAppStore.getState().usualOrg).toBeNull();
  });

  it("says which team the vote is for, and goes back to the usual one", async () => {
    vi.spyOn(api, "getMyOrgs").mockResolvedValue([TEAM_A]);
    useAppStore.setState({ session: SESSION });
    useAppStore.getState().openLinkOrg(TEAM_B);
    await useAppStore.getState().loadOrgs();

    renderWithProviders(<LinkOrgBanner />);
    expect(screen.getByText("Tu votes pour FC B")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revenir à FC A" }));

    const s = useAppStore.getState();
    expect(s.currentOrg).toMatchObject({ id: "org-a" });
    expect(s.linkOrg).toBeNull();
    expect(screen.queryByText("Tu votes pour FC B")).toBeNull();
  });

  it("shows no banner on the user's usual team", async () => {
    vi.spyOn(api, "getMyOrgs").mockResolvedValue([TEAM_A]);
    useAppStore.setState({ session: SESSION });
    useAppStore.getState().openLinkOrg(TEAM_A);
    await useAppStore.getState().loadOrgs();

    renderWithProviders(<LinkOrgBanner />);
    expect(screen.queryByText(/Tu votes pour/)).toBeNull();
  });

  it("joining is offered after the vote, never automatic", async () => {
    const getMyOrgs = vi.spyOn(api, "getMyOrgs").mockResolvedValue([TEAM_A]);
    const join = vi.spyOn(api, "selfJoinOrg").mockResolvedValue();
    useAppStore.setState({ session: SESSION });
    useAppStore.getState().openLinkOrg(TEAM_B);
    await useAppStore.getState().loadOrgs();
    expect(join).not.toHaveBeenCalled();

    renderWithProviders(<JoinLinkOrgOffer />);
    getMyOrgs.mockResolvedValue([TEAM_A, { ...TEAM_B, role: "voter" }]);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter FC B à mes équipes" }));

    await waitFor(() => expect(join).toHaveBeenCalledWith("org-b"));
    expect(await screen.findByText(/FC B fait maintenant partie de tes équipes/)).toBeInTheDocument();
    expect(useAppStore.getState().currentOrg).toMatchObject({ id: "org-b", role: "voter" });
  });
});

describe("Remembered voter identity is per team", () => {
  it("a first name remembered in one team is not reused in another", () => {
    saveVoterIdentity("Thomas", 7, "org-a");
    expect(getStoredVoterIdentity("org-a")).toEqual({ name: "Thomas", playerId: 7 });
    expect(getStoredVoterIdentity("org-b")).toBeNull();
  });

  it("an identity saved by an older version is only matched by player id", () => {
    localStorage.setItem("pepite_voter_identity", JSON.stringify({ name: "Thomas", playerId: 7 }));
    expect(getStoredVoterIdentity("org-b")).toEqual({ name: "", playerId: 7 });
  });
});
