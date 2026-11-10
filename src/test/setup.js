import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetAppStore } from "@/store/appStore";
import { loadLanguage, useLangStore } from "@/i18n";
import { server } from "./server";

beforeAll(async () => {
  // Every language loaded up front: tests switch with setLang() synchronously.
  await Promise.all([loadLanguage("en"), loadLanguage("nl")]);
  // jsdom reports an English browser: tests run in French unless they switch.
  useLangStore.setState({ lang: "fr" });
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });

  // jsdom doesn't implement scrollIntoView — stub it globally
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetAppStore();
  useLangStore.setState({ lang: "fr" });
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
