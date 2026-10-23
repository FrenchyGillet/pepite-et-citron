import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetDemoState, __demoAPI, demoState } from "@/api";
import { AdminView } from "@/components/AdminView";
import { renderApp } from "./renderApp";

const org = { id: "demo-org", name: "Demo", slug: "demo", role: "admin" };
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

function renderAdmin(activeMatch = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter><QueryClientProvider client={qc}>
      <AdminView players={demoState.players} activeMatch={activeMatch} currentOrg={org} onShowGuide={() => {}} />
    </QueryClientProvider></MemoryRouter>,
  );
}

const schedule = (o = {}) => ({
  label: "vs Dragons", starts_at: minutesAgo(100), weekday: null, start_time: null,
  timezone: "Europe/Brussels", team_id: null, pepite_count: 3, locale: "fr", ...o,
});

beforeEach(() => {
  __resetDemoState();
});

describe("Programmer un match (Admin)", () => {
  it("asks the delay the first time, schedules, and lists the match", async () => {
    renderAdmin();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Programmer" }));

    // Tomorrow 20:00, every week.
    const tomorrow = new Date(Date.now() + 86_400_000);
    const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    await user.clear(screen.getByLabelText("Date du match"));
    await user.type(screen.getByLabelText("Date du match"), day);
    await user.click(screen.getByRole("checkbox", { name: /Chaque semaine/ }));
    await user.type(screen.getByLabelText(/Adversaire ou nom du match/), "Entraînement");

    expect(screen.getByText("Combien de temps après le début du match veux-tu ouvrir le vote ?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "2 h" }));
    await user.click(screen.getByRole("button", { name: "Programmer le match" }));

    expect(await screen.findByText("Prochains matchs · 1")).toBeInTheDocument();
    expect(screen.getByText(/🔁 Entraînement/)).toBeInTheDocument();
    expect(screen.getByText(/vote à 22:00/)).toBeInTheDocument();
    expect(demoState.voteOpenDelay).toBe(120);
    expect(demoState.schedules[0]).toMatchObject({ weekday: tomorrow.getDay(), start_time: "20:00", starts_at: null });
    // Asked once: the next time only a hint.
    expect(screen.queryByText(/Combien de temps après le début/)).toBeNull();
    expect(screen.getByText(/Le vote ouvrira 2 h après le début du match/)).toBeInTheDocument();
  });

  it("refuses a match whose vote could no longer open", async () => {
    renderAdmin();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Programmer" }));
    await user.clear(screen.getByLabelText("Date du match"));
    await user.type(screen.getByLabelText("Date du match"), "2020-01-01");
    await user.click(screen.getByRole("button", { name: "Programmer le match" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ce match est déjà passé");
    expect(demoState.schedules).toHaveLength(0);
  });

  it("cancels a scheduled match after confirmation", async () => {
    await __demoAPI.createSchedule(schedule({ starts_at: new Date(Date.now() + 86_400_000).toISOString() }));
    renderAdmin();
    const user = userEvent.setup();
    const list = (await screen.findByText("Prochains matchs · 1")).parentElement;
    await user.click(within(list).getByRole("button", { name: "Annuler" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Garder" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Annuler le match" }));
    expect(await screen.findByText("Match programmé annulé")).toBeInTheDocument();
    expect(demoState.schedules).toHaveLength(0);
  });
});

describe("Ouvrir maintenant (le match finit plus tôt)", () => {
  it("opens this occurrence now, dated at kick-off, and not again at the usual time", async () => {
    // Kick-off 60 min ago, vote planned 30 min from now.
    await __demoAPI.createSchedule(schedule({ starts_at: minutesAgo(60) }));
    demoState.schedules[0].created_at = minutesAgo(24 * 60);
    renderAdmin();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Ouvrir maintenant" }));

    expect(await screen.findByText("Match ouvert !")).toBeInTheDocument();
    expect(demoState.matches).toHaveLength(1);
    expect(demoState.matches[0]).toMatchObject({ label: "vs Dragons", is_open: true, created_at: demoState.schedules[0].starts_at });
    await __demoAPI.closeMatch(demoState.matches[0].id);
    await __demoAPI.getActiveMatch();
    expect(demoState.matches).toHaveLength(1);
  });

  it("is not offered while a vote is in progress", async () => {
    await __demoAPI.createSchedule(schedule({ starts_at: minutesAgo(-24 * 60) }));
    const active = await __demoAPI.createMatch("En cours", [1, 2, 3], null, 1);
    renderAdmin(active);
    expect(await screen.findByText("Prochains matchs · 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ouvrir maintenant" })).toBeNull();
  });

  it("a vote launched by hand during the match stands for it", async () => {
    await __demoAPI.createSchedule(schedule({ starts_at: minutesAgo(60) }));
    demoState.schedules[0].created_at = minutesAgo(24 * 60);
    await __demoAPI.createMatch("À la main", [1, 2, 3], null, 1);
    expect(await __demoAPI.getUpcomingSchedules()).toHaveLength(0);
    // Its vote time passes: still one vote, no second one after the reveal.
    demoState.schedules[0].starts_at = minutesAgo(100);
    demoState.matches[0].created_at = minutesAgo(30);
    await __demoAPI.closeMatch(demoState.matches[0].id);
    await __demoAPI.getActiveMatch();
    expect(demoState.matches).toHaveLength(1);
  });

  it("explains a refusal in the user's language", async () => {
    await __demoAPI.createSchedule(schedule({ starts_at: minutesAgo(-24 * 60) }));
    await __demoAPI.createMatch("En cours", [1, 2, 3], null, 1);
    await expect(__demoAPI.openScheduleNow(demoState.schedules[0].id)).rejects.toThrow("Un vote est déjà en cours.");
    const { humanizeError } = await import("@/utils/errors");
    const { setLang } = await import("@/i18n");
    setLang("en");
    expect(humanizeError(new Error("Un vote est déjà en cours."))).toBe("A vote is already in progress.");
  });
});

describe("Ouverture automatique (règles du serveur, mode démo)", () => {
  it("opens a due vote, dated at kick-off, with the active players", async () => {
    // Created yesterday, kick-off 100 min ago, default delay 90 min: due.
    await __demoAPI.createSchedule(schedule());
    demoState.schedules[0].created_at = minutesAgo(24 * 60);
    demoState.players[9].archived_at = minutesAgo(1);

    const match = await __demoAPI.getActiveMatch();
    expect(match).toMatchObject({ label: "vs Dragons", phase: "voting", is_open: true, pepite_count: 3 });
    expect(match.created_at).toBe(demoState.schedules[0].starts_at);
    expect(match.present_ids).toHaveLength(9);
    // Never twice.
    await __demoAPI.getActiveMatch();
    expect(demoState.matches).toHaveLength(1);
  });

  it("waits while the previous vote is not revealed", async () => {
    await __demoAPI.createMatch("Ancien", [1, 2, 3], null, 1);
    await __demoAPI.createSchedule(schedule());
    demoState.schedules[0].created_at = minutesAgo(24 * 60);
    expect((await __demoAPI.getActiveMatch()).label).toBe("Ancien");
    expect(demoState.matches).toHaveLength(1);
  });

  it("a link voter sees when the next vote opens", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date(2026, 9, 27, 18, 0) });
    try {
      await __demoAPI.createSchedule(schedule({ starts_at: new Date(2026, 9, 27, 20, 0).toISOString() }));
      renderApp({ initialPath: "/vote" });
      expect(await screen.findByText(/Prochain match : mar\. 27 oct\. · 20:00/)).toBeInTheDocument();
      expect(screen.getByText(/Le vote ouvre à 21:30/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
