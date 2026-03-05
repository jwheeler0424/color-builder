/* eslint-disable react-refresh/only-export-components */
import { cn } from "@/lib/utils";
import { createContext, useCallback, useContext, useState } from "react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { MenuIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SidebarSide = "left" | "right";
export type SidebarVariant = "push" | "overlay";

export interface SidebarContextValue {
  isOpen: boolean;
  side: SidebarSide;
  variant: SidebarVariant;
  width: number;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  side?: SidebarSide;
  variant?: SidebarVariant;
  width?: number;
}

export interface SidebarProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export interface SidebarTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

export interface SidebarLayoutProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SidebarProvider({
  children,
  defaultOpen = true,
  side = "left",
  variant = "push",
  width = 260,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider
      value={{ isOpen, side, variant, width, toggle, open, close }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ─── Layout wrapper (scoped container) ───────────────────────────────────────

export function SidebarLayout({
  children,
  className = "",
  style,
}: SidebarLayoutProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Sidebar panel ────────────────────────────────────────────────────────────

export function Sidebar({
  children,
  header,
  footer,
  className = "",
}: SidebarProps) {
  const { isOpen, side, variant, width } = useSidebar();

  const translateX = isOpen
    ? "0"
    : side === "left"
      ? `-${width}px`
      : `${width}px`;

  return (
    <>
      {/* Overlay backdrop for overlay variant */}
      {variant === "overlay" && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-black/45 backdrop-blur-xs z-40 transition-opacity duration-300 pointer-events-none opacity-0",
            isOpen && "opacity-100 pointer-events-auto",
          )}
        />
      )}

      <aside
        className={cn(
          `top-0 bottom-0 [${side}]-0 relative z-auto shrink-0 flex flex-col overflow-hidden bg-background border-x border-x-border/40 transition-all duration-300 ease-in-out`,
          `translate-x-[${translateX}] w-[${width}px] min-w-[${width}px]`,
          side === "left" && "border-l-0",
          side === "right" && "border-r-0",
          variant === "overlay" && "absolute z-50",
          className,
        )}
      >
        {header && (
          <div className="px-4 py-5 border-b border-b-border/40 shrink-0">
            {header}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-3 px-0">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-t-border/40 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Main content area ────────────────────────────────────────────────────────

export function SidebarContent({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <main
      className={cn(
        "flex-1 min-w-0 overflow-y-auto transition-[flex] duration-300 ease-in-out",
        className,
      )}
      style={style}
    >
      {children}
    </main>
  );
}

// ─── Trigger button ───────────────────────────────────────────────────────────

export function SidebarTrigger({
  className = "",
  children,
}: SidebarTriggerProps) {
  const { toggle, isOpen, side } = useSidebar();

  return (
    <Button
      onClick={toggle}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      size={"icon"}
      variant={"ghost"}
      className={cn("text-muted-foreground", className)}
    >
      {children ?? <MenuIcon />}
    </Button>
  );
}

// ─── Sidebar nav helpers ──────────────────────────────────────────────────────

export function SidebarGroup({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div
          className={cn(
            `px-5 pt-1.5 pb-1 text-[10px] tracking-widest uppercase text-muted-foreground font-mono`,
            className,
          )}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  className,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      variant={"ghost"}
      size={"sm"}
      className={cn(
        "w-full flex items-center gap-2.5 cursor-pointer mr-1",
        active && `bg-secondary border-l-2 border-l-accent font-semibold`,
        className,
      )}
    >
      {icon && (
        <span
          style={{ flexShrink: 0, opacity: active ? 1 : 0.7, display: "flex" }}
        >
          {icon}
        </span>
      )}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {badge !== undefined && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: 10,
            background: active ? "var(--sidebar-accent, #6366f1)" : "#23262f",
            color: active ? "#fff" : "#9ca3af",
            fontFamily: "monospace",
          }}
        >
          {badge}
        </span>
      )}
    </Button>
  );
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────

// ─── Separator ────────────────────────────────────────────────────────────────

export function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  );
}
