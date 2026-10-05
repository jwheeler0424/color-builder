/**
 * header.tsx
 *
 * Main Desktop Header
 */

import { cn } from "@/lib/utils";
import { usePanel } from "../panel";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "../logo-icon";
import { Link } from "@tanstack/react-router";
import { Separator } from "../ui/separator";
import { ChevronDownIcon, MenuIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import * as React from "react";
import { ThemeToggle } from "../common/theme-toggle";
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from "../modals";
import { SECTIONS, SECTION_TOOLS } from "../layout/nav-desktop";

// ─── MainHeader ───────────────────────────────────────────────────────────────

interface MainHeaderProps {
  className?: string;
}

export function MainHeader({ className }: MainHeaderProps) {
  const togglePanel = usePanel((state) => state.togglePanel);
  const [anchor, setAnchor] = React.useState<HTMLDivElement | null>(null);
  return (
    <header
      className={cn(
        "relative z-30 h-fit col-start-1 col-span-2 flex flex-col bg-background",
        className,
      )}
    >
      <div className="relative" ref={setAnchor}>
        <main className="h-16 flex gap-8 items-center justify-between px-4 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2">
            <LogoIcon className="size-8" />

            <h1 className="text-3xl font-black font-display leading-10 pt-1 flex gap-0.5 items-center">
              Chroma
              <sup className="text-primary font-sans font-normal text-xl">ELITE</sup>
            </h1>
          </Link>
          <nav className="flex items-center gap-4">
            <section className="flex items-center grow">
              <ToolsNavigation anchor={anchor} />
            </section>
            <Separator orientation="vertical" className="bg-muted-foreground" />
            <section className="flex items-center gap-2">
              <Button variant="ghost" size="lg" className={"font-semibold tracking-wide"}>
                Sign In
              </Button>
              <Button variant="default" size="lg" className={"font-semibold tracking-wide"}>
                Sign Up
              </Button>
            </section>
          </nav>
        </main>
      </div>
      <section className="flex gap-8 items-center justify-between px-4 py-2 border-b border-border/30">
        <main className="text-muted-foreground">Instructions...</main>
        <nav className="flex items-center grow justify-end gap-4">
          <main className="flex items-center gap-4 h-full">
            {/* Action buttons */}
            <ThemeToggle />
            <ShareModal />
            <SaveModal />
            <ExportModal />
            <ShortcutsModal />
          </main>
          <aside className="flex items-center gap-4 h-full">
            <Button
              variant="ghost"
              size={"icon-lg"}
              onClick={() => togglePanel("main-right")}
              className="text-muted-foreground"
            >
              <MenuIcon className="size-5" />
            </Button>
          </aside>
        </nav>
      </section>
    </header>
  );
}

function ToolsNavigation({ anchor }: { anchor: HTMLDivElement | null }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="default" className="font-semibold" />}>
        Solutions
        <ChevronDownIcon
          className={cn("ml-2 size-5 transition-transform duration-150", open && "rotate-180")}
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        anchor={anchor}
        align="start"
        sideOffset={0}
        aria-label="Solutions"
        className="w-(--anchor-width) max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-none border-b border-border p-6 bg-card"
      >
        <nav aria-label="Tools" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {SECTIONS.map((section) => (
            <div key={section.id} className="min-w-0">
              <p className="px-2 pb-2 text-sm font-semibold text-foreground">{section.label}</p>
              <div className="flex flex-col gap-1">
                {SECTION_TOOLS[section.id].map((tool) => (
                  <Link
                    key={tool.to}
                    to={tool.to as Parameters<typeof Link>[0]["to"]}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: true }}
                    activeProps={{ className: "bg-secondary text-foreground" }}
                    className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring focus-visible:ring-primary/50"
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </PopoverContent>
    </Popover>
  );
}
