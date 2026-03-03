import { createContext, useCallback, useContext, useState } from "react";

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
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(2px)",
            zIndex: 40,
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            transition: "opacity 280ms ease",
          }}
        />
      )}

      <aside
        className={className}
        style={{
          position: variant === "overlay" ? "absolute" : "relative",
          top: 0,
          bottom: 0,
          [side]: 0,
          zIndex: variant === "overlay" ? 50 : "auto",
          width: `${width}px`,
          minWidth: `${width}px`,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: `translateX(${translateX})`,
          transition:
            "transform 300ms cubic-bezier(0.4,0,0.2,1), min-width 300ms cubic-bezier(0.4,0,0.2,1)",
          // Layout adjustment for push mode
          ...(variant === "push" && !isOpen ? { minWidth: 0, width: 0 } : {}),
          background: "var(--sidebar-bg, #111318)",
          borderRight:
            side === "left"
              ? "1px solid var(--sidebar-border, #23262f)"
              : "none",
          borderLeft:
            side === "right"
              ? "1px solid var(--sidebar-border, #23262f)"
              : "none",
        }}
      >
        {header && (
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sidebar-border, #23262f)",
              flexShrink: 0,
            }}
          >
            {header}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--sidebar-border, #23262f)",
              flexShrink: 0,
            }}
          >
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
      className={className}
      style={{
        flex: 1,
        minWidth: 0,
        overflowY: "auto",
        transition: "flex 300ms cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}
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
    <button
      onClick={toggle}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 6,
        border: "1px solid var(--trigger-border, #23262f)",
        background: "var(--trigger-bg, transparent)",
        color: "var(--trigger-color, #9ca3af)",
        cursor: "pointer",
        transition: "background 150ms, color 150ms, border-color 150ms",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--trigger-hover-bg, #1e2028)";
        (e.currentTarget as HTMLButtonElement).style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--trigger-bg, transparent)";
        (e.currentTarget as HTMLButtonElement).style.color =
          "var(--trigger-color, #9ca3af)";
      }}
    >
      {children ?? <HamburgerIcon isOpen={isOpen} side={side} />}
    </button>
  );
}

// ─── Sidebar nav helpers ──────────────────────────────────────────────────────

export function SidebarGroup({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div
          style={{
            padding: "6px 20px 4px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--sidebar-muted, #4b5563)",
            fontFamily: "monospace",
          }}
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
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 20px",
        background: active
          ? "var(--sidebar-active-bg, #1e2028)"
          : "transparent",
        border: "none",
        borderLeft: active
          ? "2px solid var(--sidebar-accent, #6366f1)"
          : "2px solid transparent",
        color: active
          ? "var(--sidebar-active-color, #fff)"
          : "var(--sidebar-item-color, #9ca3af)",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        textAlign: "left",
        transition: "background 120ms, color 120ms, border-color 120ms",
        borderRadius: "0 4px 4px 0",
        marginRight: 4,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--sidebar-hover-bg, #16181f)";
          (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--sidebar-item-color, #9ca3af)";
        }
      }}
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
    </button>
  );
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────

function HamburgerIcon({
  isOpen,
  side,
}: {
  isOpen: boolean;
  side: SidebarSide;
}) {
  const angle = isOpen
    ? side === "left"
      ? -180
      : 0
    : side === "left"
      ? 0
      : -180;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: `rotate(${angle}deg)`,
        transition: "transform 300ms",
      }}
    >
      <rect
        x="2"
        y="3.5"
        width="12"
        height="1.5"
        rx="0.75"
        fill="currentColor"
      />
      <rect
        x="2"
        y="7.25"
        width="8"
        height="1.5"
        rx="0.75"
        fill="currentColor"
      />
      <rect
        x="2"
        y="11"
        width="12"
        height="1.5"
        rx="0.75"
        fill="currentColor"
      />
    </svg>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

export function SidebarSeparator() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--sidebar-border, #23262f)",
        margin: "8px 0",
      }}
    />
  );
}
