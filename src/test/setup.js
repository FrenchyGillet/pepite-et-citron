import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetAppStore } from "@/store/appStore";
import { server } from "./server";

beforeAll(() => {
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
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
