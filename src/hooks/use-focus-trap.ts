import { useEffect, useRef } from "react";

const FOCUSABLE_ELEMENTS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const useFocusTrap = (
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  initialFocusRef?: React.RefObject<HTMLElement | null>,
) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      if (previousFocusRef.current) previousFocusRef.current.focus();
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    const container = containerRef.current;

    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_ELEMENTS);
      if (first) {
        first.focus();
      } else {
        container.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const elements =
        container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS);
      if (elements.length === 0) return e.preventDefault();

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive, containerRef, initialFocusRef]);
};
