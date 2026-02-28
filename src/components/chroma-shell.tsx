/**
 * chroma-shell.tsx
 *
 * Root layout shell — wraps all routes.
 * Responsive layout dispatch:
 *
 *   < 640px   → MobileShell  (Phase 5: bottom nav, snap strip, full-screen sheet)
 *   640–1023px → TabletShell  (Phase 4: nav rail, horizontal strip, bottom sheet)
 *   ≥ 1024px  → StudioShell  (Phase 3: 3-column, left rail, right panel)
 *
 * Rendered as three separate DOM trees — only one visible via Tailwind responsive
 * classes (hidden/flex). Avoids hydration mismatches from JS-based media queries.
 *
 * Wrappers: HotkeyProvider → CommandPaletteProvider → layout shell
 */

import { useEffect } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { TabletShell } from "@/components/layout/tablet-shell";
import { MobileShell } from "@/components/layout/mobile-shell";
import { DesktopStudio } from "./desktop/desktop-shell";

export function ChromaShell() {
  const { modal, closeModal } = useChromaStore();

  // Rehydrate store on mount (TanStack Start SSR)
  useEffect(() => {
    useChromaStore.persist?.rehydrate?.();
  }, []);

  // Global Escape → close modal (each shell also handles this locally,
  // but keep it here as a safety net)
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, closeModal]);

  return (
    <>
      {/* ── Mobile (<640px) ── */}
      <section className="flex sm:hidden h-full flex-col">
        <MobileShell />
      </section>

      {/* ── Tablet (640–1023px) ── */}
      <section className="hidden sm:flex lg:hidden h-full flex-col">
        <TabletShell />
      </section>

      {/* ── Desktop (≥1024px) ── */}
      <DesktopStudio />
    </>
  );
}
