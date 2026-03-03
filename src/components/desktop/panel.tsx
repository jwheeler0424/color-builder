import { Transition } from "@headlessui/react";
import { usePanelStore } from "@/stores/panel.store";
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
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

function Panel({
  children,
  className,
  dir,
  panelId,
  ...props
}: React.ComponentProps<"div"> & { panelId?: string }) {
  const isMobile = useIsMobile();
  const open = usePanelStore((state) => state.open(panelId));
  const openMobile = usePanelStore((state) => state.openMobile(panelId));
  const openMobilePanel = usePanelStore((state) => state.openMobilePanel);
  const closeMobilePanel = usePanelStore((state) => state.closeMobilePanel);

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
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Panel</SheetTitle>
            <SheetDescription>Displays the mobile panel.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Transition
      show={open}
      as="aside"
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

function PanelTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & { panelId?: string }) {
  const togglePanel = usePanelStore((state) => state.togglePanel);
  return (
    <Button
      data-panel="trigger"
      data-slot="panel-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        togglePanel(props.panelId);
      }}
      {...props}
    >
      <PanelLeftIcon className="cn-rtl-flip" />
      <span className="sr-only">Toggle Panel</span>
    </Button>
  );
}

function PanelRail({
  className,
  panelId,
  ...props
}: React.ComponentProps<"button"> & { panelId?: string }) {
  const { togglePanel } = usePanelStore();
  return (
    <button
      data-panel="rail"
      data-slot="panel-rail"
      aria-label="Toggle Panel"
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

function PanelContent({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="panel-content"
      data-panel="content"
      className={cn("relative h-full grow overflow-hidden", className)}
      {...props}
    />
  );
}

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

function PanelGroup({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel-group"
      data-panel="group"
      className={cn("p-2 relative flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  );
}
function PanelGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
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
function PanelGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
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
  const open = usePanelStore((state) => state.open(panelId));
  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
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
function PanelMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-menu-badge"
      data-panel="menu-badge"
      className={cn(
        "text-sidebar-foreground peer-hover/menu-button:text-sidebar-accent-foreground peer-data-active/menu-button:text-sidebar-accent-foreground pointer-events-none absolute right-1 h-5 min-w-5 rounded-md px-1 text-xs font-medium peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 flex items-center justify-center tabular-nums select-none group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}
function PanelMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  // Random width between 50 to 90%.
  const [width] = useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  });
  return (
    <div
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
  PanelMenuSub,
  PanelMenuSubButton,
  PanelMenuSubItem,
  PanelRail,
  PanelSeparator,
  PanelTrigger,
};
