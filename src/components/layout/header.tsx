import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from "../modals";
import { ThemeToggle } from "../theme-toggle";

const NAV = [
  { to: "/palette", label: "Palette" },
  { to: "/picker", label: "Picker" },
  { to: "/utility", label: "Utility" },
  { to: "/theme", label: "Theme" },
  { to: "/designsystem", label: "Design System" },
  { to: "/scale", label: "Tint Scale" },
  { to: "/gradient", label: "Gradients" },
  { to: "/mixer", label: "Mixer" },
  { to: "/preview", label: "CSS Preview" },
  { to: "/accessibility", label: "Accessibility" },
  { to: "/contrast", label: "Contrast" },
  { to: "/colorblind", label: "Color Blind" },
  { to: "/scoring", label: "Scoring" },
  { to: "/converter", label: "Converter" },
  { to: "/extract", label: "Image Extract" },
  { to: "/saved", label: "Saved" },
  { to: "/comparison", label: "Compare" },
  { to: "/multiscale", label: "Multi-Scale" },
  { to: "/p3", label: "P3 Gamut" },
  { to: "/brand", label: "Brand" },
  { to: "/oklch-scatter", label: "OKLCH Plot" },
] as const;

export default function Header() {
  const { modal, openModal, generate, undo } = useChromaStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        generate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.key === "?") openModal("shortcuts");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal, generate, undo, openModal]);

  return (
    <header className="flex items-center px-4 h-12 border-b border-border bg-card gap-2.5 flex-shrink-0">
      <div className="font-display text-base font-black tracking-tight flex-shrink-0 text-foreground">
        Chroma
        <sup className="text-[9px] text-muted-foreground font-normal">
          ELITE
        </sup>
      </div>
      <nav className="flex gap-px flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {NAV.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`ch-nb${pathname === to ? " on" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
      <div className="flex gap-1.5 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={undo} title="Undo (Ctrl+Z)">
          ↩
        </Button>
        <ShareModal />
        <SaveModal />
        <ExportModal />
        <ShortcutsModal />
      </div>
    </header>
  );
}
