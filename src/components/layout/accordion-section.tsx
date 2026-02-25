/**
 * accordion-section.tsx  — Phase 4 layout component
 *
 * Collapsible section for the tablet/mobile GenerateControlsAccordion.
 * State persists to sessionStorage so sections remember open/close status.
 *
 * Height animation uses measured pixel height (not height:auto → 0)
 * so the CSS transition actually works.
 */

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AccordionSectionProps {
  id: string;
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

function loadOpen(id: string, defaultOpen: boolean): boolean {
  try {
    const stored = sessionStorage.getItem(`chroma:accordion:${id}`);
    return stored === null ? defaultOpen : stored === "true";
  } catch {
    return defaultOpen;
  }
}

function saveOpen(id: string, open: boolean) {
  try {
    sessionStorage.setItem(`chroma:accordion:${id}`, String(open));
  } catch {}
}

export function AccordionSection({
  id,
  title,
  defaultOpen = false,
  className,
  children,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [height, setHeight] = useState<number | undefined>(
    defaultOpen ? undefined : 0,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  // Hydrate from sessionStorage after mount
  useEffect(() => {
    const stored = loadOpen(id, defaultOpen);
    setOpen(stored);
    if (!stored) setHeight(0);
  }, [id, defaultOpen]);

  // Update pixel height when open state changes
  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      // Measure natural height then animate to it
      const h = contentRef.current.scrollHeight;
      setHeight(h);
      // After transition complates, set to undefined so content can grow freely
      const t = setTimeout(() => setHeight(undefined), 210);
      return () => clearTimeout(t);
    } else {
      // First snap to pixel height so transition has a from-value
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [open]);

  const toggle = () => {
    setOpen((prev) => {
      saveOpen(id, !prev);
      return !prev;
    });
  };

  return (
    <div className={cn("border-b border-border", className)}>
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "text-left cursor-pointer bg-transparent border-0",
          "transition-colors hover:bg-accent/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        )}
        aria-expanded={open}
      >
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-semibold">
          {title}
        </span>
        <span
          className={cn(
            "text-muted-foreground text-[10px] transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          )}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: height === undefined ? "auto" : height }}
      >
        <div className="px-4 pb-3">{children}</div>
      </div>
    </div>
  );
}
