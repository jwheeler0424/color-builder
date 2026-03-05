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
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";

import * as React from "react";
import { ThemeToggle } from "../common/theme-toggle";
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from "../modals";
const solutions = [
  {
    name: "Insights",
    description: "Measure actions your users take",
    href: "##",
    icon: IconOne,
  },
  {
    name: "Automations",
    description: "Create your own targeted content",
    href: "##",
    icon: IconTwo,
  },
  {
    name: "Reports",
    description: "Keep track of your growth",
    href: "##",
    icon: IconThree,
  },
];

// ─── MainHeader ───────────────────────────────────────────────────────────────

interface MainHeaderProps {
  className?: string;
}

export function MainHeader({ className }: MainHeaderProps) {
  const togglePanel = usePanel((state) => state.togglePanel);
  return (
    <header
      className={cn(
        "h-fit col-start-1 col-span-2 flex flex-col bg-background",
        className,
      )}
    >
      <Popover className="relative">
        <main className="h-16 flex gap-8 items-center justify-between px-4 border-b border-border/40">
          <Link to="/" className="flex items-center gap-2">
            <LogoIcon className="size-8" />

            <h1 className="text-3xl font-black font-display leading-10 pt-1 flex gap-0.5 items-center">
              Chroma
              <sup className="text-primary font-sans font-normal text-xl">
                ELITE
              </sup>
            </h1>
          </Link>
          <nav className="flex items-center gap-4">
            <section className="flex items-center grow">
              <ToolsNavigation />
            </section>
            <Separator orientation="vertical" className="bg-muted-foreground" />
            <section className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="lg"
                className={"font-semibold tracking-wide"}
              >
                Sign In
              </Button>
              <Button
                variant="default"
                size="lg"
                className={"font-semibold tracking-wide"}
              >
                Sign Up
              </Button>
            </section>
          </nav>
        </main>
      </Popover>
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

function ToolsNavigation() {
  return (
    <>
      <PopoverButton
        as={Button}
        variant="ghost"
        size={"default"}
        className="font-semibold"
      >
        Solutions
        <ChevronDownIcon
          className={`ui-open:text-orange-300 ui-not-open:text-orange-300/70'}
                  ml-2 h-5 w-5 transition duration-150 ease-in-out group-hover:text-orange-300/80`}
          aria-hidden="true"
        />
      </PopoverButton>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel
          className={"absolute top-full right-0 left-0 w-full p-6 bg-card"}
        >
          <div className="overflow-hidden relative w-full h-full">
            <div className="relative grid gap-4 lg:grid-cols-2 w-1/2">
              {solutions.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-secondary focus:outline-none focus-visible:ring focus-visible:ring-orange-500/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground sm:h-12 sm:w-12">
                    <item.icon
                      aria-hidden="true"
                      className="[&>rect:first-child]:fill-orange-200/50 [&>rect:first-child]:dark:fill-orange-800/20"
                    />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </a>
              ))}
              <div className="p-2">
                <a
                  href="##"
                  className="flow-root rounded-md p-4 transition duration-150 ease-in-out hover:bg-secondary focus:outline-none focus-visible:ring focus-visible:ring-orange-500/50"
                >
                  <span className="flex items-center">
                    <span className="text-sm font-medium text-foreground">
                      Documentation
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Start integrating products and tools
                  </span>
                </a>
              </div>
            </div>
          </div>
        </PopoverPanel>
      </Transition>
    </>
  );
}
function IconOne({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" />
      <path
        d="M24 11L35.2583 17.5V30.5L24 37L12.7417 30.5V17.5L24 11Z"
        stroke="#FB923C"
        strokeWidth="2"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.7417 19.8094V28.1906L24 32.3812L31.2584 28.1906V19.8094L24 15.6188L16.7417 19.8094Z"
        stroke="#FDBA74"
        strokeWidth="2"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.7417 22.1196V25.882L24 27.7632L27.2584 25.882V22.1196L24 20.2384L20.7417 22.1196Z"
        stroke="#FDBA74"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconTwo({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" />
      <path
        d="M28.0413 20L23.9998 13L19.9585 20M32.0828 27.0001L36.1242 34H28.0415M19.9585 34H11.8755L15.9171 27"
        stroke="#FB923C"
        strokeWidth="2"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.804 30H29.1963L24.0001 21L18.804 30Z"
        stroke="#FDBA74"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconThree({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="8" />
      <rect x="13" y="32" width="2" height="4" fill="#FDBA74" />
      <rect x="17" y="28" width="2" height="8" fill="#FDBA74" />
      <rect x="21" y="24" width="2" height="12" fill="#FDBA74" />
      <rect x="25" y="20" width="2" height="16" fill="#FDBA74" />
      <rect x="29" y="16" width="2" height="20" fill="#FB923C" />
      <rect x="33" y="12" width="2" height="24" fill="#FB923C" />
    </svg>
  );
}
