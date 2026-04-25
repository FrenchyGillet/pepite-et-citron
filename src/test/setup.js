import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetAppStore } from "@/store/appStore";
import { server } from "./server";

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
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
