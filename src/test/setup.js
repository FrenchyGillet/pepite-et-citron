import "@testing-library/jest-dom";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  // Reset location search (used by guest tests)
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, search: "" },
  });
});
