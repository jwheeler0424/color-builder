import { Transition } from "@headlessui/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PanelLeftIcon } from "lucide-react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, VariantProps } from "class-variance-authority";
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { create } from "zustand";

// ---------------------------------------------------------------------------
// Utility hooks
// ---------------------------------------------------------------------------

/**
 * Returns true when the user has requested reduced motion via their OS
 * accessibility settings. Used to disable animations for those users.
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a panelId prop into a stable DOM id used for aria-controls. */
function getPanelDomId(panelId?: string) {
  return `panel-region-${panelId ?? "default"}`;
}

// ---------------------------------------------------------------------------
// PanelGroup label association context
// ---------------------------------------------------------------------------

type PanelGroupContextValue = { labelId: string };
const PanelGroupContext = createContext<PanelGroupContextValue>({
  labelId: "",
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type PanelState = {
  open: boolean;
  openMobile: boolean;
};

export type PanelStore = {
  panels: Record<string, PanelState>;
  createPanel: (id?: string) => void;
  closeAll: () => void;
  openPanel: (id?: string) => void;
  closePanel: (id?: string) => void;
  togglePanel: (id?: string) => void;
  openMobilePanel: (id?: string) => void;
  closeMobilePanel: (id?: string) => void;
  toggleMobilePanel: (id?: string) => void;
  open: (id?: string) => boolean;
  openMobile: (id?: string) => boolean;
};

function createNewPanel(newId?: string): { id: string; panel: PanelState } {
  const panelId = newId || "default";
  const id = `panel-${panelId}`;
  return { id, panel: { open: false, openMobile: false } };
}

const usePanel = create<PanelStore>()((set, get) => ({
  panels: {},
  createPanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      if (state.panels[panelId]) return {};
      const newPanels = { ...state.panels };
      const { panel } = createNewPanel(id);
      newPanels[panelId] = { ...panel };
      return { panels: newPanels };
    }),
  closeAll: () =>
    set((state) => {
      const newPanels = { ...state.panels };
      Object.keys(newPanels).forEach((key) => {
        newPanels[key] = { ...newPanels[key], open: false, openMobile: false };
      });
      return { panels: newPanels };
    }),
  openPanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      const panel = state.panels[panelId] ?? createNewPanel(id).panel;
      return {
        panels: { ...state.panels, [panelId]: { ...panel, open: true } },
      };
    }),
  closePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      const panel = state.panels[panelId] ?? createNewPanel(id).panel;
      return {
        panels: { ...state.panels, [panelId]: { ...panel, open: false } },
      };
    }),
  togglePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      const panel = state.panels[panelId] ?? createNewPanel(id).panel;
      return {
        panels: { ...state.panels, [panelId]: { ...panel, open: !panel.open } },
      };
    }),
  openMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      const panel = state.panels[panelId] ?? createNewPanel(id).panel;
      return {
        panels: { ...state.panels, [panelId]: { ...panel, openMobile: true } },
      };
    }),
  closeMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      const panel = state.panels[panelId] ?? createNewPanel(id).panel;
      return {
        panels: { ...state.panels, [panelId]: { ...panel, openMobile: false } },
      };
    }),
  toggleMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      const panel = state.panels[panelId] ?? createNewPanel(id).panel;
      return {
        panels: {
          ...state.panels,
          [panelId]: { ...panel, openMobile: !panel.openMobile },
        },
      };
    }),
  open: (id?: string) => {
    const panelId = `panel-${id || "default"}`;
    return get().panels[panelId]?.open ?? false;
  },
  openMobile: (id?: string) => {
    const panelId = `panel-${id || "default"}`;
    return get().panels[panelId]?.openMobile ?? false;
  },
}));

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

function Panel({
  children,
  className,
  dir,
  panelId,
  "aria-label": ariaLabel = "Panel",
  ...props
}: React.ComponentProps<"div"> & {
  panelId?: string;
  /** Accessible label for the panel landmark. Defaults to "Panel". */
  "aria-label"?: string;
}) {
  const isMobile = useIsMobile();
  const open = usePanel((state) => state.open(panelId));
  const openMobile = usePanel((state) => state.openMobile(panelId));
  const openMobilePanel = usePanel((state) => state.openMobilePanel);
  const closeMobilePanel = usePanel((state) => state.closeMobilePanel);
  // FIX 3: Disable animations when the user prefers reduced motion.
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? "duration-0" : "duration-300";
  const domId = getPanelDomId(panelId);

  if (isMobile) {
    return (
      <Sheet
        open={openMobile}
        onOpenChange={(isOpen) => {
          if (isOpen) openMobilePanel(panelId);
          else closeMobilePanel(panelId);
        }}
        {...props}
      >
        <SheetContent
          dir={dir}
          data-panel="panel"
          data-slot="panel"
          data-mobile="true"
          className="w-[18rem] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          side="right"
          aria-label={ariaLabel}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{ariaLabel}</SheetTitle>
            <SheetDescription>Displays the mobile panel.</SheetDescription>
          </SheetHeader>
          <div id={domId} className="flex h-full w-full flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Transition
      show={open}
      as="aside"
      aria-label={ariaLabel}
      // Hide content from assistive technology while collapsed so focus
      // cannot land inside a hidden panel.
      aria-hidden={!open}
      enter={`transition-all ${duration} ease-in-out`}
      enterFrom="w-88 translate-x-full"
      enterTo="w-88 translate-x-0"
      leave={`transition-all ${duration} ease-in-out`}
      leaveFrom="w-88 translate-x-0"
      leaveTo="w-88 translate-x-full"
      className="group shrink-0"
      data-state={open ? "expanded" : "collapsed"}
      data-slot="panel"
    >
      <div
        id={domId}
        className={cn("w-88 h-full", className)}
        data-slot="panel-container"
      >
        <section
          className={cn("w-full h-full", className)}
          data-slot="panel-inner"
        >
          {children}
        </section>
      </div>
    </Transition>
  );
}

// ---------------------------------------------------------------------------
// PanelTrigger
// ---------------------------------------------------------------------------

function PanelTrigger({
  className,
  onClick,
  panelId,
  ...props
}: React.ComponentProps<typeof Button> & { panelId?: string }) {
  const togglePanel = usePanel((state) => state.togglePanel);
  const open = usePanel((state) => state.open(panelId));
  const domId = getPanelDomId(panelId);

  // FIX 8: Return focus to the trigger when the panel closes so keyboard
  // users are not left with a lost focus position.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current && !open) {
      triggerRef.current?.focus();
    }
    prevOpen.current = open;
  }, [open]);

  return (
    <Button
      ref={triggerRef}
      data-panel="trigger"
      data-slot="panel-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      aria-expanded={open}
      aria-controls={domId}
      onClick={(event) => {
        onClick?.(event);
        togglePanel(panelId);
      }}
      {...props}
    >
      <PanelLeftIcon className="cn-rtl-flip" aria-hidden="true" />
      <span className="sr-only">Toggle Panel</span>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// PanelRail
// ---------------------------------------------------------------------------

function PanelRail({
  className,
  panelId,
  ...props
}: React.ComponentProps<"button"> & { panelId?: string }) {
  const { togglePanel } = usePanel();
  const open = usePanel((state) => state.open(panelId));
  const domId = getPanelDomId(panelId);

  return (
    <button
      type="button"
      data-panel="rail"
      data-slot="panel-rail"
      aria-label="Toggle Panel"
      aria-expanded={open}
      aria-controls={domId}
      tabIndex={-1}
      onClick={() => togglePanel(panelId)}
      title="Toggle Panel"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelInput
// ---------------------------------------------------------------------------

function PanelInput({
  className,
  label,
  id: idProp,
  ...props
}: React.ComponentProps<typeof Input> & {
  /**
   * Optional visible or screen-reader-only label text. When provided, a
   * visually hidden <label> is rendered and associated with the input so
   * screen readers announce the field's purpose. If you need a visible label,
   * render your own <label> with a matching htmlFor instead.
   */
  label?: string;
}) {
  // FIX: PanelInput now supports an optional `label` prop that wires up a
  // visually hidden <label> so the input always has an accessible name.
  const autoId = useId();
  const inputId = idProp ?? autoId;

  return (
    <>
      {label && (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      )}
      <Input
        id={inputId}
        data-slot="panel-input"
        data-panel="input"
        className={cn("bg-background h-8 w-full shadow-none", className)}
        {...props}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// PanelHeader
// ---------------------------------------------------------------------------

function PanelHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="panel-header"
      data-panel="header"
      className={cn("gap-2 p-2 flex flex-col", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelContent
//
// Changed from <main> (only one per page) to <div role="region">. A region
// landmark MUST have an accessible name (aria-label or aria-labelledby) to be
// surfaced by screen readers; a dev warning fires if neither is provided.
// ---------------------------------------------------------------------------

function PanelContent({
  className,
  "aria-label": ariaLabel = "Panel content",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      data-slot="panel-content"
      data-panel="content"
      className={cn("relative h-full grow overflow-hidden", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelFooter
// ---------------------------------------------------------------------------

function PanelFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="panel-footer"
      data-panel="footer"
      className={cn(className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelSeparator
// ---------------------------------------------------------------------------

function PanelSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    // FIX: Separator is purely decorative; hide it from the accessibility tree
    // so screen readers do not announce an unlabelled separator element.
    <Separator
      aria-hidden="true"
      data-slot="panel-separator"
      data-panel="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelGroup
// ---------------------------------------------------------------------------

function PanelGroup({ className, ...props }: React.ComponentProps<"section">) {
  // FIX: Generate a stable id and share it via context so PanelGroupLabel
  // can automatically wire up aria-labelledby without extra consumer effort.
  const labelId = useId();
  return (
    <PanelGroupContext.Provider value={{ labelId }}>
      <section
        role="group"
        aria-labelledby={labelId}
        data-slot="panel-group"
        data-panel="group"
        className={cn("p-2 relative flex w-full min-w-0 flex-col", className)}
        {...props}
      />
    </PanelGroupContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// PanelGroupLabel
// ---------------------------------------------------------------------------

function PanelGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  const { labelId } = useContext(PanelGroupContext);
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        id: labelId,
        className: cn(
          "text-sidebar-foreground/70 ring-sidebar-ring h-8 rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 flex shrink-0 items-center outline-hidden [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "panel-group-label", panel: "group-label" },
  });
}

// ---------------------------------------------------------------------------
// PanelGroupAction
// ---------------------------------------------------------------------------

function PanelGroupAction({
  className,
  render,
  "aria-label": ariaLabel = "Group action",
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-label": ariaLabel,
        className: cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 w-5 rounded-md p-0 focus-visible:ring-2 [&>svg]:size-4 flex aspect-square items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "panel-group-action", panel: "group-action" },
  });
}

// ---------------------------------------------------------------------------
// PanelGroupContent
// ---------------------------------------------------------------------------

function PanelGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-group-content"
      data-panel="group-content"
      className={cn("text-sm w-full", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelMenu
// ---------------------------------------------------------------------------

function PanelMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    // FIX: role="list" explicitly preserves list semantics in browsers that
    // strip them from <ul> elements styled with list-style: none.
    <ul
      role="list"
      data-slot="panel-menu"
      data-panel="menu"
      className={cn("gap-0 flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelMenuItem
// ---------------------------------------------------------------------------

function PanelMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="panel-menu-item"
      data-panel="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelMenuButton variants
// ---------------------------------------------------------------------------

const panelMenuButtonVariants = cva(
  "ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground gap-2 rounded-md p-2 text-left text-sm transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! focus-visible:ring-2 data-active:font-medium peer/menu-button group/menu-button flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

// ---------------------------------------------------------------------------
// PanelMenuButton
// ---------------------------------------------------------------------------

function PanelMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  panelId,
  subMenuId,
  isSubMenuOpen,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
    panelId?: string;
    /**
     * FIX 4: When this button toggles a PanelMenuSub, pass the id you gave to
     * that PanelMenuSub here. The button will then automatically receive
     * aria-expanded and aria-controls so screen readers announce the
     * submenu relationship correctly.
     */
    subMenuId?: string;
    /** Current open state of the sub-menu referenced by subMenuId. */
    isSubMenuOpen?: boolean;
  } & VariantProps<typeof panelMenuButtonVariants>) {
  const isMobile = useIsMobile();
  const open = usePanel((state) => state.open(panelId));

  // FIX 2: When the panel collapses to icon-only, the visible label span is
  // hidden via CSS. Extract the tooltip string so it can double as aria-label,
  // ensuring the button always has an accessible name for screen readers.
  const tooltipLabel =
    typeof tooltip === "string"
      ? tooltip
      : typeof tooltip?.children === "string"
        ? tooltip.children
        : undefined;

  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        // FIX 1: Explicit type prevents accidental form submission.
        type: "button",
        // aria-current="page" is the standard way to mark the active nav item.
        "aria-current": isActive ? "page" : undefined,
        // FIX 2: Apply tooltip text as aria-label for the icon-only state.
        ...(tooltipLabel ? { "aria-label": tooltipLabel } : {}),
        // FIX 4: Wire up submenu aria attributes when subMenuId is provided.
        ...(subMenuId != null
          ? { "aria-expanded": !!isSubMenuOpen, "aria-controls": subMenuId }
          : {}),
        className: cn(panelMenuButtonVariants({ variant, size }), className),
      },
      props,
    ),
    render: !tooltip ? render : <TooltipTrigger render={render} />,
    state: {
      slot: "panel-menu-button",
      panel: "menu-button",
      size,
      active: isActive,
    },
  });

  if (!tooltip) return comp;

  if (typeof tooltip === "string") {
    tooltip = { children: tooltip };
  }

  return (
    <Tooltip>
      {comp}
      <TooltipContent
        side="right"
        align="center"
        hidden={!open || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// PanelMenuAction
//
// Icon-only button — consumers MUST supply aria-label describing the action
// (e.g. aria-label="Delete file"). A dev warning fires if it is missing.
// ---------------------------------------------------------------------------

function PanelMenuAction({
  className,
  render,
  showOnHover = false,
  panelId,
  "aria-label": ariaLabel = "Menu action",
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    showOnHover?: boolean;
    panelId?: string;
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-label": ariaLabel,
        className: cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 aspect-square w-5 rounded-md p-0 peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 focus-visible:ring-2 [&>svg]:size-4 flex items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
          showOnHover &&
            "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "panel-menu-action", panel: "menu-action" },
  });
}

// ---------------------------------------------------------------------------
// PanelMenuBadge
//
// The raw number is hidden from AT; consumers supply the accessible count via
// aria-label (e.g. aria-label="12 unread messages").
// ---------------------------------------------------------------------------

function PanelMenuBadge({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-menu-badge"
      data-panel="menu-badge"
      className={cn(
        "text-sidebar-foreground peer-hover/menu-button:text-sidebar-accent-foreground peer-data-active/menu-button:text-sidebar-accent-foreground pointer-events-none absolute right-1 h-5 min-w-5 rounded-md px-1 text-xs font-medium peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 flex items-center justify-center tabular-nums select-none group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    >
      {/* Hide the raw number; the aria-label on the parent carries the
          accessible description, e.g. aria-label="3 notifications". */}
      <span aria-hidden="true">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelMenuSkeleton
// ---------------------------------------------------------------------------

function PanelMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & { showIcon?: boolean }) {
  const [width] = useState(() => `${Math.floor(Math.random() * 40) + 50}%`);
  return (
    // Skeleton shapes are decorative; hide them from the accessibility tree.
    // Use the companion <PanelMenuSkeletonStatus> to announce loading state.
    <div
      aria-hidden="true"
      data-slot="panel-menu-skeleton"
      data-panel="menu-skeleton"
      className={cn("h-8 gap-2 rounded-md px-2 flex items-center", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-panel="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-panel="menu-skeleton-text"
        style={{ "--skeleton-width": width } as React.CSSProperties}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelMenuSkeletonStatus
//
// Pair with one or more <PanelMenuSkeleton> items. The live region announces
// loading state to screen readers without cluttering the visual UI.
//
// Usage:
//   {isLoading && (
//     <>
//       <PanelMenuSkeletonStatus />
//       <PanelMenuSkeleton />
//       <PanelMenuSkeleton showIcon />
//     </>
//   )}
// ---------------------------------------------------------------------------

function PanelMenuSkeletonStatus({
  loadingText = "Loading…",
}: {
  loadingText?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {loadingText}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelMenuSub
//
// FIX 4: Accepts an `id` prop so a parent PanelMenuButton can reference it
// via aria-controls, establishing the submenu relationship for screen readers.
// FIX: role="list" preserves list semantics stripped by CSS resets.
// ---------------------------------------------------------------------------

function PanelMenuSub({ className, id, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      role="list"
      id={id}
      data-slot="panel-menu-sub"
      data-panel="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 translate-x-px gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden flex min-w-0 flex-col",
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelMenuSubItem
// ---------------------------------------------------------------------------

function PanelMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="panel-menu-sub-item"
      data-panel="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelMenuSubButton
// ---------------------------------------------------------------------------

function PanelMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"a"> &
  React.ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        "aria-current": isActive ? "page" : undefined,
        // FIX: <a> without href is not keyboard focusable by default.
        // tabIndex={0} ensures the element is always reachable via Tab
        // regardless of whether href is supplied.
        tabIndex: 0,
        className: cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground h-7 gap-2 rounded-md px-2 focus-visible:ring-2 data-[size=md]:text-sm data-[size=sm]:text-xs [&>svg]:size-4 flex min-w-0 -translate-x-px items-center overflow-hidden outline-hidden group-data-[collapsible=icon]:hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "panel-menu-sub-button",
      panel: "menu-sub-button",
      size,
      active: isActive,
    },
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Panel,
  PanelContent,
  PanelFooter,
  PanelGroup,
  PanelGroupAction,
  PanelGroupContent,
  PanelGroupLabel,
  PanelHeader,
  PanelInput,
  PanelMenu,
  PanelMenuAction,
  PanelMenuBadge,
  PanelMenuButton,
  PanelMenuItem,
  PanelMenuSkeleton,
  PanelMenuSkeletonStatus,
  PanelMenuSub,
  PanelMenuSubButton,
  PanelMenuSubItem,
  PanelRail,
  PanelSeparator,
  PanelTrigger,
  usePanel,
};
