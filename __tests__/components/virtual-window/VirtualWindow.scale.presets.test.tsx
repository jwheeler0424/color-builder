import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import VirtualWindow, {
  type VirtualWindowRef,
} from "@/components/virtual-window/VirtualWindow";
import {
  DEVICE_PRESETS,
  type DevicePreset,
} from "@/components/virtual-window/lib/devicePresets";

describe("VirtualWindow - Scale and Presets", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe("Scale/Zoom functionality", () => {
    it("applies default scale of 1", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1);
      });
    });

    it("applies controlled scale prop", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} scale={0.75}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(0.75);
      });
    });

    it("applies scale transform to host element", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} scale={0.5}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.transform).toContain("scale(0.5)");
      });
    });

    it("setScale updates scale within bounds", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1);
      });

      await act(async () => {
        ref.current?.setScale(1.5);
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1.5);
      });

      // Test clamping
      await act(async () => {
        ref.current?.setScale(10);
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(5); // Max is 5
      });

      await act(async () => {
        ref.current?.setScale(0.01);
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(0.1); // Min is 0.1
      });
    });

    it("zoomIn increases scale by 0.1", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      // Don't use controlled scale - we need uncontrolled for ref methods to work
      render(
        <VirtualWindow ref={ref}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1);
      });

      await act(async () => {
        ref.current?.zoomIn();
      });

      await waitFor(() => {
        // Use toBeCloseTo for floating point comparison
        expect(ref.current?.getScale()).toBeCloseTo(1.1, 10);
      });

      await act(async () => {
        ref.current?.zoomIn();
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBeCloseTo(1.2, 10);
      });
    });

    it("zoomOut decreases scale by 0.1", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      // Don't use controlled scale - we need uncontrolled for ref methods to work
      render(
        <VirtualWindow ref={ref}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1);
      });

      // First zoom in to 1.5
      await act(async () => {
        ref.current?.setScale(1.5);
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1.5);
      });

      // Then zoom out
      await act(async () => {
        ref.current?.zoomOut();
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBeCloseTo(1.4, 10);
      });
    });

    it("resetZoom returns to 1", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      // Don't use controlled scale - we need uncontrolled for ref methods to work
      render(
        <VirtualWindow ref={ref}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1);
      });

      // First set scale to 2
      await act(async () => {
        ref.current?.setScale(2);
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(2);
      });

      // Then reset
      await act(async () => {
        ref.current?.resetZoom();
      });

      await waitFor(() => {
        expect(ref.current?.getScale()).toBe(1);
      });
    });

    it("calls onScaleChange callback", async () => {
      const onScaleChange = vi.fn();
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} onScaleChange={onScaleChange}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      await act(async () => {
        ref.current?.setScale(1.5);
      });
      expect(onScaleChange).toHaveBeenCalledWith(1.5);

      await act(async () => {
        ref.current?.zoomIn();
      });
      expect(onScaleChange).toHaveBeenCalledWith(1.6);

      await act(async () => {
        ref.current?.zoomOut();
      });
      expect(onScaleChange).toHaveBeenCalledWith(1.5);

      await act(async () => {
        ref.current?.resetZoom();
      });
      expect(onScaleChange).toHaveBeenCalledWith(1);
    });

    it("toLocalPoint accounts for scale", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} scale={2}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      // Mock getBoundingClientRect
      const host = ref.current?.hostElement;
      if (host) {
        vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
          left: 100,
          top: 100,
          width: 750, // 375 * 2
          height: 1334, // 667 * 2
          right: 850,
          bottom: 1434,
          x: 100,
          y: 100,
          toJSON: () => ({}),
        });
      }

      // Create a mock pointer event
      const mockEvent = {
        clientX: 300, // 200px from left
        clientY: 300, // 200px from top
      } as PointerEvent;

      const localPoint = ref.current?.toLocalPoint(mockEvent);

      // With scale=2, 200px offset / 2 = 100px local
      expect(localPoint?.x).toBe(100);
      expect(localPoint?.y).toBe(100);
    });
  });

  describe("Device Presets", () => {
    it("applies preset by name", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} preset="iphone-15-pro">
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const size = ref.current?.getSize();
        expect(size?.width).toBe(393);
        expect(size?.height).toBe(852);
      });
    });

    it("applies preset by object", async () => {
      const ref = React.createRef<VirtualWindowRef>();
      const preset = DEVICE_PRESETS["pixel-7-pro"];

      render(
        <VirtualWindow ref={ref} preset={preset}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const size = ref.current?.getSize();
        expect(size?.width).toBe(412);
        expect(size?.height).toBe(915);
      });
    });

    it("falls back to default dimensions with invalid preset", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} preset="invalid-device">
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const size = ref.current?.getSize();
        expect(size?.width).toBe(375); // Default
        expect(size?.height).toBe(667); // Default
      });
    });

    it("updates size when preset changes", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      const { rerender } = render(
        <VirtualWindow ref={ref} preset="iphone-se">
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const size = ref.current?.getSize();
        expect(size?.width).toBe(375);
        expect(size?.height).toBe(667);
      });

      // Change preset
      rerender(
        <VirtualWindow ref={ref} preset="ipad-air">
          <div>Test Content</div>
        </VirtualWindow>,
      );

      await waitFor(() => {
        const size = ref.current?.getSize();
        expect(size?.width).toBe(820);
        expect(size?.height).toBe(1180);
      });
    });

    it("preset overrides width and height props", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} preset="iphone-14" width={500} height={800}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const size = ref.current?.getSize();
        // Should use preset dimensions, not prop dimensions
        expect(size?.width).toBe(390);
        expect(size?.height).toBe(844);
      });
    });
  });

  describe("Combined Scale and Presets", () => {
    it("applies both preset and scale", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} preset="iphone-15-pro" scale={0.5}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const size = ref.current?.getSize();
        const scale = ref.current?.getScale();

        // Size should be preset dimensions
        expect(size?.width).toBe(393);
        expect(size?.height).toBe(852);

        // Scale should be applied
        expect(scale).toBe(0.5);
      });
    });

    it("toLocalPoint works correctly with preset and scale", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} preset="iphone-se" scale={0.75}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      const host = ref.current?.hostElement;
      if (host) {
        // iPhone SE dimensions: 375x667, scaled to 0.75 = 281.25x500.25 visual
        vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
          left: 50,
          top: 50,
          width: 281.25,
          height: 500.25,
          right: 331.25,
          bottom: 550.25,
          x: 50,
          y: 50,
          toJSON: () => ({}),
        });
      }

      const mockEvent = {
        clientX: 200, // 150px from left
        clientY: 200, // 150px from top
      } as PointerEvent;

      const localPoint = ref.current?.toLocalPoint(mockEvent);

      // 150px offset / 0.75 scale = 200px local coordinates
      expect(localPoint?.x).toBe(200);
      expect(localPoint?.y).toBe(200);
    });
  });

  describe("All device presets", () => {
    it("loads all preset devices successfully", () => {
      const presetNames = Object.keys(DEVICE_PRESETS);
      expect(presetNames.length).toBeGreaterThan(10); // We have 15+ presets

      presetNames.forEach((name) => {
        const preset = DEVICE_PRESETS[name] as DevicePreset;
        expect(preset.name).toBe(name);
        expect(preset.width).toBeGreaterThan(0);
        expect(preset.height).toBeGreaterThan(0);
        expect(preset.displayName).toBeTruthy();
        expect(preset.category).toMatch(/mobile|tablet|desktop|watch/);
      });
    });
  });
});
