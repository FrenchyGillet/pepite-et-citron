import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { __demoAPI } from "@/App";
import { EmailPreferences } from "@/components/EmailPreferences";

function renderPrefs(orgId) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EmailPreferences orgId={orgId} orgName="Les Lions" />
    </QueryClientProvider>
  );
}

// F10: members choose whether they get the "vote ouvert" emails.
describe("Profil — Emails de vote", () => {
  it("is on by default and names the team", async () => {
    renderPrefs("org-default");
    const toggle = await screen.findByRole("switch", { name: "Recevoir les emails de vote" });
    await screen.findByText("Un email quand un vote est ouvert dans Les Lions.");
    expect(toggle).toBeChecked();
  });

  it("turns the emails off and back on", async () => {
    renderPrefs("org-toggle");
    const user = userEvent.setup();
    const toggle = await screen.findByRole("switch", { name: "Recevoir les emails de vote" });
    await vi_waitEnabled(toggle);

    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(await __demoAPI.getEmailNotifications("org-toggle")).toBe(false);

    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(await __demoAPI.getEmailNotifications("org-toggle")).toBe(true);
  });
});

async function vi_waitEnabled(el) {
  const { waitFor } = await import("@testing-library/react");
  await waitFor(() => expect(el).not.toBeDisabled());
}
