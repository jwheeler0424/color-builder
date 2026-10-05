"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "@/lib/utils";

const DrawerContext = React.createContext({
  modal: true as DrawerPrimitive.Root.Props["modal"],
  showSwipeHandle: true,
});

function Drawer({
  modal = true,
  showSwipeHandle = true,
  ...props
}: DrawerPrimitive.Root.Props & { showSwipeHandle?: boolean }) {
  return (
    <DrawerContext.Provider value={{ modal, showSwipeHandle }}>
      <DrawerPrimitive.Root data-slot="drawer" modal={modal} {...props} />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 min-h-dvh bg-black/30 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: DrawerPrimitive.Popup.Props) {
  const { modal, showSwipeHandle } = React.useContext(DrawerContext);
  return (
    <DrawerPortal data-slot="drawer-portal">
      {modal === true && <DrawerOverlay />}
      <DrawerPrimitive.Viewport className="pointer-events-none fixed inset-0 z-50">
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "group/drawer-content pointer-events-auto fixed z-50 flex min-h-0 flex-col bg-background text-sm outline-none transition-transform duration-300 data-swiping:duration-0 data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:max-h-[80dvh] data-[swipe-direction=down]:rounded-t-lg data-[swipe-direction=down]:border-t data-[swipe-direction=down]:[transform:translateY(calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px)))] data-[swipe-direction=down]:data-starting-style:translate-y-full data-[swipe-direction=down]:data-ending-style:translate-y-full data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:max-h-[80dvh] data-[swipe-direction=up]:rounded-b-lg data-[swipe-direction=up]:border-b data-[swipe-direction=up]:data-starting-style:-translate-y-full data-[swipe-direction=up]:data-ending-style:-translate-y-full data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:w-3/4 data-[swipe-direction=left]:max-w-sm data-[swipe-direction=left]:rounded-r-lg data-[swipe-direction=left]:border-r data-[swipe-direction=left]:data-starting-style:-translate-x-full data-[swipe-direction=left]:data-ending-style:-translate-x-full data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:w-3/4 data-[swipe-direction=right]:max-w-sm data-[swipe-direction=right]:rounded-l-lg data-[swipe-direction=right]:border-l data-[swipe-direction=right]:data-starting-style:translate-x-full data-[swipe-direction=right]:data-ending-style:translate-x-full",
            className,
          )}
          {...props}
        >
          {showSwipeHandle && <DrawerSwipeHandle />}
          <DrawerPrimitive.Content className="flex min-h-0 flex-1 flex-col overflow-auto">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerSwipeHandle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="drawer-swipe-handle"
      className={cn(
        "mx-auto mt-4 hidden h-1.5 w-24 shrink-0 rounded-full bg-muted group-data-[swipe-direction=down]/drawer-content:block",
        className,
      )}
      {...props}
    />
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "gap-0.5 p-4 group-data-[swipe-direction=down]/drawer-content:text-center group-data-[swipe-direction=up]/drawer-content:text-center md:gap-1.5 md:text-left flex flex-col",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("gap-2 p-4 mt-auto flex flex-col", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-medium", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerSwipeHandle,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
