import React from "react";

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import VirtualWindow, {
  type VirtualWindowRef,
} from "@/components/virtual-window/VirtualWindow";

describe("VirtualWindow", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("renders without crashing", async () => {
    const ref = React.createRef<VirtualWindowRef>();

    render(
      <VirtualWindow ref={ref}>
        <div>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    // Wait for shadow DOM to be created
    await waitFor(() => {
      expect(ref.current?.shadowRoot).toBeTruthy();
    });
  });

  it("creates a shadow root", async () => {
    const ref = React.createRef<VirtualWindowRef>();

    render(
      <VirtualWindow ref={ref}>
        <div>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    await waitFor(() => {
      expect(ref.current?.shadowRoot).toBeTruthy();
      expect(ref.current?.shadowRoot?.mode).toBe("open");
    });
  });

  it("sets initial size correctly", async () => {
    const ref = React.createRef<VirtualWindowRef>();

    render(
      <VirtualWindow ref={ref} width={400} height={600}>
        <div>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    await waitFor(() => {
      const size = ref.current?.getSize();
      expect(size?.width).toBe(400);
      expect(size?.height).toBe(600);
    });
  });

  it("exposes host element via ref", async () => {
    const ref = React.createRef<VirtualWindowRef>();

    render(
      <VirtualWindow ref={ref}>
        <div>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    await waitFor(() => {
      expect(ref.current?.hostElement).toBeInstanceOf(HTMLDivElement);
    });
  });

  it("creates 8 resize handles in shadow DOM", async () => {
    const ref = React.createRef<VirtualWindowRef>();

    render(
      <VirtualWindow ref={ref}>
        <div>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    await waitFor(() => {
      const shadowRoot = ref.current?.shadowRoot;
      const handles = shadowRoot?.querySelectorAll(".resize-handle");
      expect(handles?.length).toBe(8);
    });
  });

  it("renders children in shadow DOM mount node", async () => {
    const ref = React.createRef<VirtualWindowRef>();
    const testId = "test-child";

    render(
      <VirtualWindow ref={ref}>
        <div data-testid={testId}>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    await waitFor(() => {
      const shadowRoot = ref.current?.shadowRoot;
      const mountNode = shadowRoot?.querySelector(".virtual-window-mount");
      expect(mountNode).toBeTruthy();

      // Child should be in shadow DOM, not in light DOM
      const childInShadow = shadowRoot?.querySelector(
        `[data-testid="${testId}"]`,
      );
      expect(childInShadow).toBeTruthy();
    });
  });

  it("applies custom className to host element", async () => {
    const ref = React.createRef<VirtualWindowRef>();
    const className = "custom-class";

    render(
      <VirtualWindow ref={ref} className={className}>
        <div>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    await waitFor(() => {
      expect(ref.current?.hostElement?.className).toContain(className);
    });
  });

  it("applies custom styles to host element", async () => {
    const ref = React.createRef<VirtualWindowRef>();
    const customStyle = { backgroundColor: "red" };

    render(
      <VirtualWindow ref={ref} style={customStyle}>
        <div>Test Content</div>
      </VirtualWindow>,
      { container },
    );

    await waitFor(() => {
      const bgColor = ref.current?.hostElement?.style.backgroundColor;
      expect(bgColor).toBe("red");
    });
  });
});
