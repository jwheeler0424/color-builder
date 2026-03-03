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
import React, { createContext, useContext, useId, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { create } from "zustand";

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

function createNewPanel(newId?: string): {
  id: string;
  panel: PanelState;
} {
  const panelId = newId || "default";
  const id = `panel-${panelId}`;
  return {
    id,
    panel: {
      open: false,
      openMobile: false,
    },
  };
}

const usePanel = create<PanelStore>()((set, get) => ({
  panels: {},
  createPanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      if (state.panels[panelId]) {
        return {};
      }
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
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, open: true };
      return { panels: newPanels };
    }),
  closePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, open: false };
      return { panels: newPanels };
    }),
  togglePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, open: !panel.open };
      return { panels: newPanels };
    }),
  openMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, openMobile: true };
      return { panels: newPanels };
    }),
  closeMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, openMobile: false };
      return { panels: newPanels };
    }),
  toggleMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, openMobile: !panel.openMobile };
      return { panels: newPanels };
    }),
  open: (id?: string) => {
    const panelId = `panel-${id || "default"}`;
    const panel = get().panels[panelId];
    return panel ? panel.open : false;
  },
  openMobile: (id?: string) => {
    const panelId = `panel-${id || "default"}`;
    const panel = get().panels[panelId];
    return panel ? panel.openMobile : false;
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
  // Accept an accessible label for the landmark; defaults to "Panel".
  "aria-label": ariaLabel = "Panel",
  ...props
}: React.ComponentProps<"div"> & {
  panelId?: string;
  "aria-label"?: string;
}) {
  const isMobile = useIsMobile();
  const open = usePanel((state) => state.open(panelId));
  const openMobile = usePanel((state) => state.openMobile(panelId));
  const openMobilePanel = usePanel((state) => state.openMobilePanel);
  const closeMobilePanel = usePanel((state) => state.closeMobilePanel);

  // Stable DOM id so PanelTrigger / PanelRail can reference it via aria-controls.
  const domId = getPanelDomId(panelId);

  if (isMobile) {
    return (
      <Sheet
        open={openMobile}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            openMobilePanel(panelId);
          } else {
            closeMobilePanel(panelId);
          }
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
          // The SheetContent receives focus on open; aria-label makes the
          // dialog landmark meaningful to screen readers.
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
      // Landmark label for screen readers.
      aria-label={ariaLabel}
      // Hide content from assistive technology while the panel is animating
      // out or fully collapsed so focus cannot land inside a hidden panel.
      aria-hidden={!open}
      enter="transition-all duration-300 ease-in-out"
      enterFrom="w-88 translate-x-full"
      enterTo="w-88 translate-x-0"
      leave="transition-all duration-300 ease-in-out"
      leaveFrom="w-88 translate-x-0"
      leaveTo="w-88 translate-x-full"
      className="group shrink-0"
      data-state={open ? "expanded" : "collapsed"}
      data-slot="panel"
    >
      <main
        // The stable id is placed on the visible container so aria-controls
        // on the trigger points to the correct element.
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
      </main>
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

  return (
    <Button
      data-panel="trigger"
      data-slot="panel-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      // Communicate collapsed/expanded state to assistive technology.
      aria-expanded={open}
      // Point to the panel region this button controls.
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
      // Explicit type prevents accidental form submission.
      type="button"
      data-panel="rail"
      data-slot="panel-rail"
      aria-label="Toggle Panel"
      // Communicate collapsed/expanded state to assistive technology.
      aria-expanded={open}
      // Point to the panel region this rail controls.
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
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="panel-input"
      data-panel="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
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
      className={cn("flex flex-col px-4 py-4", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelContent
//
// Changed from <main> (only one <main> is valid per page) to a <div> with
// role="region". Consumers should pass an aria-label or aria-labelledby to
// make the landmark meaningful, e.g. <PanelContent aria-label="File tree">.
// ---------------------------------------------------------------------------

function PanelContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="region"
      data-slot="panel-content"
      data-panel="content"
      className={cn("relative h-full grow overflow-hidden px-4", className)}
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
    <Separator
      data-slot="panel-separator"
      data-panel="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelGroup
//
// Generates a stable labelId and provides it via context so PanelGroupLabel
// can wire up the aria-labelledby relationship automatically.
// ---------------------------------------------------------------------------

function PanelGroup({ className, ...props }: React.ComponentProps<"section">) {
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
//
// Automatically receives the id generated by the parent PanelGroup so the
// group landmark is correctly labelled for screen readers.
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
        // Wire this label up to the parent group's aria-labelledby.
        id: labelId,
        className: cn(
          "text-sidebar-foreground/70 ring-sidebar-ring h-8 rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 flex shrink-0 items-center outline-hidden [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "panel-group-label",
      panel: "group-label",
    },
  });
}

// ---------------------------------------------------------------------------
// PanelGroupAction
// ---------------------------------------------------------------------------

function PanelGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        // Explicit type so the button never submits a form unintentionally.
        type: "button",
        className: cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 w-5 rounded-md p-0 focus-visible:ring-2 [&>svg]:size-4 flex aspect-square items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "panel-group-action",
      panel: "group-action",
    },
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
    <ul
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
    defaultVariants: {
      variant: "default",
      size: "default",
    },
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
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
    panelId?: string;
  } & VariantProps<typeof panelMenuButtonVariants>) {
  const isMobile = useIsMobile();
  const open = usePanel((state) => state.open(panelId));
  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        // aria-current="page" is the standard way to mark the active item in
        // a navigation list so screen readers announce it correctly.
        "aria-current": isActive ? "page" : undefined,
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
  if (!tooltip) {
    return comp;
  }
  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
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
// This is an icon-only button. Consumers MUST pass an aria-label describing
// the action (e.g. aria-label="Delete file") — it is forwarded via ...props.
// ---------------------------------------------------------------------------

function PanelMenuAction({
  className,
  render,
  showOnHover = false,
  panelId,
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
        // Explicit type prevents accidental form submission.
        type: "button",
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
    state: {
      slot: "panel-menu-action",
      panel: "menu-action",
    },
  });
}

// ---------------------------------------------------------------------------
// PanelMenuBadge
//
// Badges are purely visual. The numeric value is surfaced to screen readers
// via aria-label on the wrapping element; the inner content is aria-hidden.
// Usage: <PanelMenuBadge aria-label="3 notifications">3</PanelMenuBadge>
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
      // aria-label should be supplied by the consumer to describe the count,
      // e.g. aria-label="12 unread messages". It is forwarded via ...props.
      className={cn(
        "text-sidebar-foreground peer-hover/menu-button:text-sidebar-accent-foreground peer-data-active/menu-button:text-sidebar-accent-foreground pointer-events-none absolute right-1 h-5 min-w-5 rounded-md px-1 text-xs font-medium peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 flex items-center justify-center tabular-nums select-none group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    >
      {/* Hide the raw number from screen readers; the aria-label on the
          parent carries the accessible description. */}
      <span aria-hidden="true">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelMenuSkeleton
//
// Skeleton loaders are decorative. We hide them from screen readers with
// aria-hidden and instead provide a single role="status" live region so
// assistive technology announces that content is loading without repeating
// the announcement for every individual skeleton item.
// ---------------------------------------------------------------------------

function PanelMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  const [width] = useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  });
  return (
    <div
      // Hide purely decorative skeleton shapes from assistive technology.
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
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelMenuSkeletonStatus
//
// Pair this with one or more <PanelMenuSkeleton> items. It announces loading
// state to screen readers via a live region without cluttering the visual UI.
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
// ---------------------------------------------------------------------------

function PanelMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
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
        // Mirror the same aria-current pattern used in PanelMenuButton so
        // screen readers announce the active sub-item consistently.
        "aria-current": isActive ? "page" : undefined,
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
