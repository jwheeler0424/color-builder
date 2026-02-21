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
    <header className="ch-hdr">
      <div className="ch-brand">
        Chroma<sup>v3</sup>
      </div>
      <nav className="ch-nav">
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
      <div className="ch-hbtns">
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
