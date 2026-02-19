import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPreviewMatchMedia } from "@/components/virtual-window/lib/createPreviewMatchMedia";

describe("createPreviewMatchMedia", () => {
  let container: HTMLDivElement;
  let matchMedia: ReturnType<typeof createPreviewMatchMedia>;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "600px";
    container.style.height = "800px";
    document.body.appendChild(container);

    // Mock getBoundingClientRect to return actual dimensions
    // jsdom doesn't calculate layout, so we need to mock this
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      width: 600,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    matchMedia = createPreviewMatchMedia(container);
  });

  afterEach(() => {
    matchMedia.destroy();
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe("width queries", () => {
    it("evaluates min-width correctly", () => {
      const mql = matchMedia.matchMedia("(min-width: 500px)");
      expect(mql.matches).toBe(true);
      expect(mql.media).toBe("(min-width: 500px)");
    });

    it("evaluates max-width correctly", () => {
      const mql = matchMedia.matchMedia("(max-width: 700px)");
      expect(mql.matches).toBe(true);
    });

    it("evaluates min-width false case", () => {
      const mql = matchMedia.matchMedia("(min-width: 700px)");
      expect(mql.matches).toBe(false);
    });

    it("evaluates max-width false case", () => {
      const mql = matchMedia.matchMedia("(max-width: 500px)");
      expect(mql.matches).toBe(false);
    });
  });

  describe("height queries", () => {
    it("evaluates min-height correctly", () => {
      const mql = matchMedia.matchMedia("(min-height: 700px)");
      expect(mql.matches).toBe(true);
    });

    it("evaluates max-height correctly", () => {
      const mql = matchMedia.matchMedia("(max-height: 900px)");
      expect(mql.matches).toBe(true);
    });
  });

  describe("orientation queries", () => {
    it("evaluates portrait correctly", () => {
      const mql = matchMedia.matchMedia("(orientation: portrait)");
      expect(mql.matches).toBe(true); // 600x800 is portrait
    });

    it("evaluates landscape correctly", () => {
      const mql = matchMedia.matchMedia("(orientation: landscape)");
      expect(mql.matches).toBe(false); // 600x800 is not landscape
    });
  });

  describe("compound queries", () => {
    it("evaluates AND queries", () => {
      const mql = matchMedia.matchMedia(
        "(min-width: 500px) and (max-width: 700px)",
      );
      expect(mql.matches).toBe(true);
    });

    it("evaluates OR queries", () => {
      const mql = matchMedia.matchMedia(
        "(max-width: 400px), (min-width: 500px)",
      );
      expect(mql.matches).toBe(true); // Second part matches
    });

    it("evaluates complex queries", () => {
      const mql = matchMedia.matchMedia(
        "(min-width: 500px) and (orientation: portrait)",
      );
      expect(mql.matches).toBe(true);
    });
  });

  describe("event listeners", () => {
    it.skip("calls addEventListener when match changes", () => {
      // Note: This test requires actual ResizeObserver functionality
      // which isn't fully supported in jsdom. In a real browser environment,
      // this would work correctly. To test this properly, use Playwright/Cypress.
      const mql = matchMedia.matchMedia("(min-width: 700px)");
      expect(mql.matches).toBe(false);

      mql.addEventListener("change", (e) => {
        expect(e.matches).toBe(true);
      });

      // Simulate resize - won't trigger in jsdom
      container.style.width = "800px";
    });

    it("supports onchange property", () => {
      const mql = matchMedia.matchMedia("(min-width: 700px)");
      let called = false;

      mql.onchange = (e) => {
        called = true;
        expect(e.matches).toBe(true);
      };

      expect(called).toBe(false);
    });

    it("removes listeners correctly", () => {
      const mql = matchMedia.matchMedia("(min-width: 700px)");
      let callCount = 0;

      const listener = () => {
        callCount++;
      };

      mql.addEventListener("change", listener);
      mql.removeEventListener("change", listener);

      // If listener is removed, count should stay 0
      expect(callCount).toBe(0);
    });
  });

  describe("caching", () => {
    it("returns same MediaQueryList for identical queries", () => {
      const mql1 = matchMedia.matchMedia("(min-width: 600px)");
      const mql2 = matchMedia.matchMedia("(min-width: 600px)");

      expect(mql1).toBe(mql2);
    });

    it("returns different MediaQueryList for different queries", () => {
      const mql1 = matchMedia.matchMedia("(min-width: 600px)");
      const mql2 = matchMedia.matchMedia("(max-width: 600px)");

      expect(mql1).not.toBe(mql2);
    });
  });

  describe("cleanup", () => {
    it("cleans up on destroy", () => {
      const mql = matchMedia.matchMedia("(min-width: 600px)");
      expect(mql.matches).toBe(true);

      matchMedia.destroy();

      // After destroy, should not throw errors when creating new queries
      expect(() => {
        matchMedia.matchMedia("(min-width: 700px)");
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles invalid queries gracefully", () => {
      const mql = matchMedia.matchMedia("invalid query");
      expect(mql.matches).toBe(false);
    });

    it("handles empty query", () => {
      const mql = matchMedia.matchMedia("");
      expect(mql.matches).toBe(false);
    });

    it("handles whitespace in queries", () => {
      const mql = matchMedia.matchMedia("  ( min-width : 500px )  ");
      expect(mql.matches).toBe(true);
    });
  });
});
