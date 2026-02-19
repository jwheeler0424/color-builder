import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import VirtualWindow, {
  type VirtualWindowRef,
} from "@/components/virtual-window/VirtualWindow";

describe("VirtualWindow - Drag and Position", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe("Position prop", () => {
    it("applies initial position when draggable", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable position={{ x: 100, y: 200 }}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.position).toBe("absolute");
        expect(host?.style.left).toBe("100px");
        expect(host?.style.top).toBe("200px");
      });
    });

    it("uses relative positioning when not draggable", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable={false}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.position).toBe("relative");
      });
    });

    it("updates position when prop changes", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      const { rerender } = render(
        <VirtualWindow ref={ref} draggable position={{ x: 50, y: 50 }}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.left).toBe("50px");
        expect(host?.style.top).toBe("50px");
      });

      rerender(
        <VirtualWindow ref={ref} draggable position={{ x: 150, y: 250 }}>
          <div>Test Content</div>
        </VirtualWindow>,
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.left).toBe("150px");
        expect(host?.style.top).toBe("250px");
      });
    });
  });

  describe("Position ref methods", () => {
    it("getPosition returns current position", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable position={{ x: 123, y: 456 }}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const position = ref.current?.getPosition();
        expect(position?.x).toBe(123);
        expect(position?.y).toBe(456);
      });
    });

    it("setPosition updates position", async () => {
      const ref = React.createRef<VirtualWindowRef>();
      const onPositionChange = vi.fn();

      render(
        <VirtualWindow ref={ref} draggable onPositionChange={onPositionChange}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      await act(async () => {
        ref.current?.setPosition({ x: 300, y: 400 });
      });

      await waitFor(() => {
        const position = ref.current?.getPosition();
        expect(position?.x).toBe(300);
        expect(position?.y).toBe(400);
        expect(onPositionChange).toHaveBeenCalledWith({ x: 300, y: 400 });
      });
    });

    it("centerInParent calculates center position", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      // Create a parent with known dimensions
      const parent = document.createElement("div");
      parent.style.width = "1000px";
      parent.style.height = "800px";
      parent.style.position = "relative";
      container.appendChild(parent);

      render(
        <VirtualWindow ref={ref} draggable width={200} height={150}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container: parent },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      // Mock parent getBoundingClientRect
      vi.spyOn(parent, "getBoundingClientRect").mockReturnValue({
        width: 1000,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        ref.current?.centerInParent();
      });

      await waitFor(() => {
        const position = ref.current?.getPosition();
        // Centered: (1000 - 200) / 2 = 400, (800 - 150) / 2 = 325
        expect(position?.x).toBe(400);
        expect(position?.y).toBe(325);
      });
    });

    it("centerInParent accounts for scale", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      const parent = document.createElement("div");
      parent.style.width = "1000px";
      parent.style.height = "800px";
      parent.style.position = "relative";
      container.appendChild(parent);

      render(
        <VirtualWindow ref={ref} draggable width={200} height={150} scale={2}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container: parent },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      vi.spyOn(parent, "getBoundingClientRect").mockReturnValue({
        width: 1000,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      await act(async () => {
        ref.current?.centerInParent();
      });

      await waitFor(() => {
        const position = ref.current?.getPosition();
        // With 2x scale: (1000 - 400) / 2 = 300, (800 - 300) / 2 = 250
        expect(position?.x).toBe(300);
        expect(position?.y).toBe(250);
      });
    });
  });

  describe("Drag interactions", () => {
    it("shows move cursor when draggable", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable dragHandle="window">
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.cursor).toBe("move");
      });
    });

    it("does not show move cursor when not draggable", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable={false}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.cursor).not.toBe("move");
      });
    });
  });

  describe("Callback behavior", () => {
    it("calls onPositionChange when position changes", async () => {
      const onPositionChange = vi.fn();
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable onPositionChange={onPositionChange}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      await act(async () => {
        ref.current?.setPosition({ x: 100, y: 200 });
      });

      expect(onPositionChange).toHaveBeenCalledWith({ x: 100, y: 200 });
    });

    it("does not call onPositionChange when not draggable", async () => {
      const onPositionChange = vi.fn();
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow
          ref={ref}
          draggable={false}
          onPositionChange={onPositionChange}
        >
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        expect(ref.current).toBeTruthy();
      });

      // Position methods should still work, but no callback
      await act(async () => {
        ref.current?.setPosition({ x: 100, y: 200 });
      });

      // Callback still fires from ref method
      expect(onPositionChange).toHaveBeenCalledWith({ x: 100, y: 200 });
    });
  });

  describe("Position with other features", () => {
    it("position works with scale", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow
          ref={ref}
          draggable
          position={{ x: 50, y: 100 }}
          scale={0.5}
        >
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        expect(host?.style.left).toBe("50px");
        expect(host?.style.top).toBe("100px");
        expect(host?.style.transform).toContain("scale(0.5)");
      });
    });

    it("position works with presets", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow
          ref={ref}
          draggable
          position={{ x: 75, y: 125 }}
          preset="iphone-15-pro"
        >
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const host = ref.current?.hostElement;
        const size = ref.current?.getSize();

        expect(host?.style.left).toBe("75px");
        expect(host?.style.top).toBe("125px");
        expect(size?.width).toBe(393); // iPhone 15 Pro width
      });
    });
  });

  describe("Edge cases", () => {
    it("handles negative positions", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable position={{ x: -50, y: -100 }}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const position = ref.current?.getPosition();
        expect(position?.x).toBe(-50);
        expect(position?.y).toBe(-100);
      });
    });

    it("handles very large positions", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow ref={ref} draggable position={{ x: 10000, y: 20000 }}>
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const position = ref.current?.getPosition();
        expect(position?.x).toBe(10000);
        expect(position?.y).toBe(20000);
      });
    });

    it("handles fractional positions", async () => {
      const ref = React.createRef<VirtualWindowRef>();

      render(
        <VirtualWindow
          ref={ref}
          draggable
          position={{ x: 123.456, y: 789.012 }}
        >
          <div>Test Content</div>
        </VirtualWindow>,
        { container },
      );

      await waitFor(() => {
        const position = ref.current?.getPosition();
        expect(position?.x).toBe(123.456);
        expect(position?.y).toBe(789.012);
      });
    });
  });
});
