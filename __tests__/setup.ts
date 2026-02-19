// __tests__/setup.ts
import "@testing-library/jest-dom/vitest"; // Import the matchers
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Extends Vitest's expect with matchers from jest-dom
// This step might be redundant with the import above in newer versions
// expect.extend(matchers);

// Runs cleanup after each test suite
afterEach(() => {
  cleanup();
});
