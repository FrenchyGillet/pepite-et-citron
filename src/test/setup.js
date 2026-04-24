import "@testing-library/jest-dom";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetAppStore } from "../store/appStore";

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetAppStore();
  // Reset location search (used by guest tests)
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, search: "" },
  });
});
