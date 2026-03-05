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
// Animation constant
// ---------------------------------------------------------------------------

/**
 * Single source of truth for all panel slide animations.
 * Change the duration or easing here to update every transition at once.
 * The reduced-motion path swaps in "duration-0" at runtime (see Panel).
 */
const PANEL_TRANSITION = {
  duration: "duration-300",
  easing: "ease-in-out",
} as const;

// ---------------------------------------------------------------------------
// Utility hooks
// ---------------------------------------------------------------------------

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
// Types
// ---------------------------------------------------------------------------

export type PanelSide = "left" | "right" | "top" | "bottom";

/**
 * Controls how the panel collapses:
 * - "offcanvas" — slides fully off-screen (default)
 * - "icon"      — shrinks to a narrow icon-width strip; content should use
 *                 group-data-[collapsible=icon]:hidden to hide labels
 * - "none"      — never collapses; trigger has no effect
 */
export type PanelCollapsible = "offcanvas" | "icon" | "none";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPanelDomId(panelId?: string) {
  return `panel-region-${panelId ?? "default"}`;
}

/**
 * Returns the fixed-size class for the inner content container in offcanvas
 * mode.  The outer wrapper animates its own width/height (see Panel), so the
 * inner container always stays at the full panel size and is clipped by the
 * wrapper's overflow-hidden.
 */
function getOffcanvasConfig(side: PanelSide) {
  const isHorizontal = side === "left" || side === "right";
  const sizeClass = isHorizontal
    ? "w-(--panel-width) h-full"
    : "h-(--panel-height) w-full";
  return { sizeClass, isHorizontal };
}

/**
 * Sheet side and size class for the mobile drawer — shared across all
 * collapsible modes since mobile always shows a full-size sheet.
 */
function getSheetConfig(side: PanelSide) {
  const isHorizontal = side === "left" || side === "right";
  return {
    sheetSide: side as "left" | "right" | "top" | "bottom",
    sheetClass: isHorizontal ? "w-[18rem] h-full" : "h-[22rem] w-full",
  };
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
  style,
  dir,
  panelId,
  side = "right",
  collapsible = "offcanvas",
  // Size CSS variable overrides. Applied as custom properties so child
  // components can reference them via w-(--panel-width) etc.
  panelWidth = "22rem",
  panelWidthIcon = "3rem",
  panelHeight = "22rem",
  panelHeightIcon = "3.5rem",
  "aria-label": ariaLabel = "Panel",
  ...props
}: React.ComponentProps<"div"> & {
  panelId?: string;
  side?: PanelSide;
  /**
   * Controls collapse behaviour:
   * - "offcanvas" slides fully off-screen (default)
   * - "icon"      shrinks to a narrow icon strip
   * - "none"      always visible, toggle has no effect
   */
  collapsible?: PanelCollapsible;
  /** Full expanded width for left/right panels. Default "22rem". */
  panelWidth?: string;
  /** Collapsed icon-strip width for left/right panels. Default "3rem". */
  panelWidthIcon?: string;
  /** Full expanded height for top/bottom panels. Default "22rem". */
  panelHeight?: string;
  /** Collapsed icon-strip height for top/bottom panels. Default "3.5rem". */
  panelHeightIcon?: string;
  "aria-label"?: string;
}) {
  const isMobile = useIsMobile();
  const open = usePanel((state) => state.open(panelId));
  const openMobile = usePanel((state) => state.openMobile(panelId));
  const openMobilePanel = usePanel((state) => state.openMobilePanel);
  const closeMobilePanel = usePanel((state) => state.closeMobilePanel);
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? "duration-0" : PANEL_TRANSITION.duration;
  const easing = PANEL_TRANSITION.easing;
  const domId = getPanelDomId(panelId);
  const isHorizontal = side === "left" || side === "right";
  const { sheetSide, sheetClass } = getSheetConfig(side);

  // CSS variables exposed to children so they can respond to icon mode with
  // Tailwind utilities like group-data-[collapsible=icon]:hidden.
  const cssVars = {
    "--panel-width": panelWidth,
    "--panel-width-icon": panelWidthIcon,
    "--panel-height": panelHeight,
    "--panel-height-icon": panelHeightIcon,
    ...style,
  } as React.CSSProperties;

  // ── Mobile: always full-size Sheet regardless of collapsible mode ──────────
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
          className={cn(
            "bg-sidebar p-2 text-sidebar-foreground [&>button]:hidden",
            sheetClass,
          )}
          side={sheetSide}
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

  // ── collapsible="none": always visible, no animation ─────────────────────
  if (collapsible === "none") {
    return (
      <aside
        id={domId}
        aria-label={ariaLabel}
        data-side={side}
        data-collapsible="none"
        data-state="expanded"
        data-slot="panel"
        style={cssVars}
        className={cn(
          "group shrink-0 p-2",
          isHorizontal
            ? "w-(--panel-width) h-full"
            : "h-(--panel-height) w-full",
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    );
  }

  // ── collapsible="icon": always visible, width/height transitions ──────────
  //
  // data-collapsible mirrors shadcn's sidebar pattern:
  //   expanded  → data-collapsible=""
  //   collapsed → data-collapsible="icon"
  //
  // Children can hide text labels with:
  //   className="group-data-[collapsible=icon]:hidden"
  //
  // aria-hidden is intentionally omitted — the panel is always reachable by
  // keyboard and screen readers in both expanded and icon states.
  if (collapsible === "icon") {
    return (
      <aside
        id={domId}
        aria-label={ariaLabel}
        data-side={side}
        data-collapsible={open ? "" : "icon"}
        data-state={open ? "expanded" : "collapsed"}
        data-slot="panel"
        style={cssVars}
        className={cn(
          "group shrink-0 overflow-hidden p-2",
          isHorizontal
            ? [
                `transition-[width] ${duration} ${easing}`,
                "h-full",
                open ? "w-(--panel-width)" : "w-(--panel-width-icon)",
              ]
            : [
                `transition-[height] ${duration} ${easing}`,
                "w-full",
                open ? "h-(--panel-height)" : "h-(--panel-height-icon)",
              ],
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    );
  }

  // ── collapsible="offcanvas" (default): slides fully off-screen ────────────
  //
  // Two-layer animation so the surrounding layout adapts gracefully:
  //
  //   1. Outer <aside> animates its OWN width/height between 0 and the full
  //      panel size (with overflow-hidden).  Sibling elements respond to this
  //      dimension change, so they slide rather than jump.
  //
  //   2. Inner container simultaneously translates along the same axis, giving
  //      the panel content its directional "slide-in / slide-out" feel.
  //
  // The Headless-UI <Transition> that was here previously only applied a CSS
  // translate to the content — the outer element always occupied its full
  // width, which is why the rest of the layout snapped instead of sliding.
  const { sizeClass } = getOffcanvasConfig(side);

  return (
    <aside
      id={domId}
      aria-label={ariaLabel}
      // Hidden from assistive technology while fully off-screen so focus
      // cannot land inside a visually hidden panel.
      aria-hidden={!open}
      data-side={side}
      data-collapsible="offcanvas"
      data-state={open ? "expanded" : "collapsed"}
      data-slot="panel"
      style={cssVars}
      className={cn(
        "group shrink-0 overflow-hidden",
        isHorizontal
          ? [
              `transition-[width] ${duration} ${easing}`,
              "h-full",
              open ? "w-(--panel-width)" : "w-0",
            ]
          : [
              `transition-[height] ${duration} ${easing}`,
              "w-full",
              open ? "h-(--panel-height)" : "h-0",
            ],
      )}
    >
      <div className={cn(sizeClass)} data-slot="panel-container">
        <section
          className={cn("w-full h-full p-2", className)}
          data-slot="panel-inner"
        >
          {children}
        </section>
      </div>
    </aside>
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

  // Return focus to the trigger when the panel closes so keyboard users are
  // not left with a lost focus position (offcanvas mode only; in icon mode
  // the panel is always visible so focus management is not needed).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current && !open) triggerRef.current?.focus();
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
   * When provided, renders a visually-hidden <label> associated with the
   * input so screen readers always announce the field's purpose.
   */
  label?: string;
}) {
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
      className={cn("gap-2 flex flex-col", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelContent
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
     * When this button toggles a PanelMenuSub, pass the id of that sub here.
     * The button will receive aria-expanded + aria-controls automatically.
     */
    subMenuId?: string;
    isSubMenuOpen?: boolean;
  } & VariantProps<typeof panelMenuButtonVariants>) {
  const isMobile = useIsMobile();
  const open = usePanel((state) => state.open(panelId));

  // In icon-only mode the visible label span is CSS-hidden. Apply the tooltip
  // string as aria-label so the button always has an accessible name.
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
        type: "button",
        "aria-current": isActive ? "page" : undefined,
        ...(tooltipLabel ? { "aria-label": tooltipLabel } : {}),
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
  if (typeof tooltip === "string") tooltip = { children: tooltip };

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
