/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
/**
 * hotkey-context.tsx
 *
 * Central keyboard shortcut registry. Components register hotkeys by calling
 * useRegisterHotkey(); the provider listens on document and dispatches matches.
 *
 * Design decisions:
 *  - useRef-based registry: registrations never cause re-renders
 *  - Handlers are deduped by key string; last-registered wins (route-scoped)
 *  - Skips if focus is inside an input/textarea/select (natural editing behavior)
 *  - All registered hotkeys are available to ShortcutsModal via getHotkeyList()
 */

import React, {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HotkeyDef {
  /** Lowercase key, e.g. 'g', 'z', ' ', 'arrowleft' */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  /** Short human label for the shortcuts panel */
  label: string;
  handler: () => void;
  /** Optional group for display in shortcuts modal */
  group?: string;
}

type Registry = Map<string, HotkeyDef>;

interface HotkeyContextValue {
  register: (def: HotkeyDef) => () => void;
  getList: () => HotkeyDef[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const HotkeyContext = createContext<HotkeyContextValue | null>(null);

// ─── Canonical key string ─────────────────────────────────────────────────────

function keyStr(def: Pick<HotkeyDef, "key" | "ctrl" | "shift">): string {
  return [
    def.ctrl ? "ctrl" : "",
    def.shift ? "shift" : "",
    def.key.toLowerCase(),
  ]
    .filter(Boolean)
    .join("+");
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function HotkeyProvider({ children }: { children: ReactNode }) {
  const registry = useRef<Registry>(new Map());

  const register = useCallback((def: HotkeyDef): (() => void) => {
    const k = keyStr(def);
    registry.current.set(k, def);
    return () => registry.current.delete(k);
  }, []);

  const getList = useCallback((): HotkeyDef[] => {
    return Array.from(registry.current.values());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in form fields
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = (e.target as HTMLElement).isContentEditable;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        isEditable
      )
        return;

      const k = keyStr({
        key: e.key.toLowerCase() === " " ? "space" : e.key.toLowerCase(),
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
      });

      const def = registry.current.get(k);
      if (def) {
        e.preventDefault();
        def.handler();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <HotkeyContext.Provider value={{ register, getList }}>
      {children}
    </HotkeyContext.Provider>
  );
}

// ─── Hook: register a hotkey for the lifetime of a component ─────────────────

export function useRegisterHotkey(def: HotkeyDef) {
  const ctx = useContext(HotkeyContext);
  // Stable handler ref so re-renders don't cause unnecessary deregistrations
  const handlerRef = useRef(def.handler);
  handlerRef.current = def.handler;

  useEffect(() => {
    if (!ctx) return;
    const stableDef: HotkeyDef = {
      ...def,
      handler: () => handlerRef.current(),
    };
    return ctx.register(stableDef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.key, def.ctrl, def.shift, def.label, def.group]);
}

// ─── Hook: read the full hotkey list (for the shortcuts modal) ────────────────

export function useHotkeyList(): HotkeyDef[] {
  const ctx = useContext(HotkeyContext);
  const [list, setList] = React.useState<HotkeyDef[]>([]);
  useEffect(() => {
    if (!ctx) return;
    // Snapshot on mount and whenever the modal is likely to open
    setList(ctx.getList());
  }, [ctx]);
  return list;
}
