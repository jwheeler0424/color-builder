/**
 * command-palette.tsx
 *
 * Global Cmd+K command palette. Surfaces every tool, action, and hotkey
 * in one searchable overlay. Registered in ChromaShell, triggered via
 * useCommandPalette() hook or the search pill in the header.
 *
 * Usage:
 *   const { open, setOpen } = useCommandPalette()
 *
 * The palette indexes:
 *   - All 14 tools (with section labels)
 *   - All registered hotkey actions
 *   - Recent items (persisted in localStorage, max 5)
 */

import {
  IconAccessible,
  IconAdjustments,
  IconBrush,
  IconChartBar,
  IconColorSwatch,
  IconDownload,
  IconEye,
  IconGradienter,
  IconHeart,
  IconKeyboard,
  IconLayoutDashboard,
  IconPalette,
  IconPhoto,
  IconRefresh,
  IconRulerMeasure,
  IconSearch,
  IconShare,
  IconTrademark,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { useCommandModifier } from '@/hooks/use-command-modifier';
import { cn } from '@/lib/utils';
import { useHotkeyList, useRegisterHotkey } from '@/providers/hotkey.provider';

import { Kbd, KbdGroup } from '../ui/kbd';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  section: 'Palette' | 'Analyze' | 'Build' | 'Export' | 'Action';
  keywords?: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string;
  action?: () => void;
}

// ─── Tool registry ────────────────────────────────────────────────────────────

const TOOLS: CommandItem[] = [
  // Palette
  {
    id: 'palette',
    label: 'Palette',
    section: 'Palette',
    icon: IconPalette,
    route: '/palette',
    keywords: 'generate slots colors',
  },
  // Analyze — merged views
  {
    id: 'accessibility',
    label: 'Accessibility (WCAG + Contrast + Color Blind)',
    section: 'Analyze',
    icon: IconAccessible,
    route: '/analyze/accessibility',
    keywords: 'wcag contrast aa aaa apca a11y color blind deuteranopia',
  },
  {
    id: 'scoring',
    label: 'Score & Compare palettes',
    section: 'Analyze',
    icon: IconChartBar,
    route: '/analyze/scoring',
    keywords: 'score grade evaluate balance compare diff',
  },
  {
    id: 'oklch-scatter',
    label: 'Visualize (OKLCH + P3 Gamut)',
    section: 'Analyze',
    icon: IconEye,
    route: '/analyze/visualize',
    keywords: 'oklch perceptual p3 gamut wide color chroma scatter',
  },
  // Build — merged views
  {
    id: 'theme-optimizer',
    label: 'Theme optimizer',
    section: 'Build',
    icon: IconPalette,
    route: '/build/theme',
    keywords: 'light dark contrast accessibility optimize palette recommendations',
  },
  {
    id: 'mixer',
    label: 'Color mixer',
    section: 'Build',
    icon: IconColorSwatch,
    route: '/build/mixer',
    keywords: 'mix blend interpolate combine',
  },
  {
    id: 'gradient',
    label: 'Gradient editor',
    section: 'Build',
    icon: IconGradienter,
    route: '/build/gradient',
    keywords: 'gradient linear radial conic stops',
  },
  {
    id: 'extract',
    label: 'Extract & Convert',
    section: 'Build',
    icon: IconPhoto,
    route: '/build/extract',
    keywords: 'image extract palette photo upload convert hex hsl oklch cmyk',
  },
  // Export — merged views
  {
    id: 'scale',
    label: 'Scales (Single + Full Palette)',
    section: 'Export',
    icon: IconRulerMeasure,
    route: '/export/scale',
    keywords: 'tint shade scale 50 100 500 900 steps tokens all palette',
  },
  {
    id: 'designsystem',
    label: 'Tokens & CSS Preview',
    section: 'Export',
    icon: IconLayoutDashboard,
    route: '/export/designsystem',
    keywords: 'design system semantic tokens css variables figma preview app',
  },
  {
    id: 'theme',
    label: 'Theme generator',
    section: 'Export',
    icon: IconBrush,
    route: '/export/theme',
    keywords: 'theme tailwind shadcn dark light generate',
  },
  {
    id: 'utility',
    label: 'Utility colors',
    section: 'Export',
    icon: IconAdjustments,
    route: '/export/utility',
    keywords: 'utility destructive warning success info semantic',
  },
  {
    id: 'brand',
    label: 'Brand compliance',
    section: 'Export',
    icon: IconTrademark,
    route: '/analyze/brand',
    keywords: 'brand compliance guidelines logo',
  },
];

const SECTION_ORDER = ['Palette', 'Analyze', 'Build', 'Export', 'Action'] as const;

// ─── Recent items ─────────────────────────────────────────────────────────────

const RECENT_KEY = 'chroma:cmd-recent';
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function pushRecent(id: string) {
  const prev = loadRecent().filter((r) => r !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
}

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, item: CommandItem): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = `${item.label} ${item.keywords ?? ''} ${item.section}`.toLowerCase();
  // All query tokens must appear somewhere in the haystack
  return q.split(' ').every((token) => haystack.includes(token));
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CommandPaletteCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteCtx>({
  open: false,
  setOpen: () => {},
});

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useRegisterHotkey({
    key: 'k',
    ctrl: true,
    label: 'Toggle command palette',
    group: 'App',
    allowInInput: true,
    handler: () => setOpen((value) => !value),
  });

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette key={open ? 'open' : 'closed'} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

// ─── Main component ───────────────────────────────────────────────────────────

function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const commandModifier = useCommandModifier();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent] = useState<string[]>(() => loadRecent());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const generate = useChromaStore((s) => s.generate);
  const openModal = useChromaStore((s) => s.openModal);
  const hotkeyList = useHotkeyList(open);

  // Fresh command state is created each time the palette opens.
  useEffect(() => {
    if (!open) return;
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(focusTimeout);
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  // Build action items from hotkey registry
  const actionItems: CommandItem[] = useMemo(
    () =>
      hotkeyList.map((h) => ({
        id: `action:${h.key}`,
        label: h.label,
        section: 'Action' as const,
        icon: IconKeyboard,
        keywords: h.group ?? '',
        action: h.handler,
      })),
    [hotkeyList],
  );

  // Always-available actions
  const builtinActions = useMemo<CommandItem[]>(
    () => [
      {
        id: 'action:generate',
        label: 'Generate new palette',
        section: 'Action',
        icon: IconRefresh,
        keywords: 'generate regen space',
        action: generate,
      },
      {
        id: 'action:save',
        label: 'Save current palette',
        section: 'Action',
        icon: IconHeart,
        keywords: 'save store',
        action: () => openModal('save'),
      },
      {
        id: 'action:export',
        label: 'Export palette',
        section: 'Action',
        icon: IconDownload,
        keywords: 'export download copy',
        action: () => openModal('export'),
      },
      {
        id: 'action:share',
        label: 'Share palette URL',
        section: 'Action',
        icon: IconShare,
        keywords: 'share link url',
        action: () => openModal('share'),
      },
      {
        id: 'action:shortcuts',
        label: 'Keyboard shortcuts',
        section: 'Action',
        icon: IconKeyboard,
        keywords: 'hotkey keyboard help',
        action: () => openModal('shortcuts'),
      },
    ],
    [generate, openModal],
  );

  const allItems = useMemo(
    () => [...TOOLS, ...builtinActions, ...actionItems],
    [builtinActions, actionItems],
  );

  // Filter
  const filtered = useMemo(() => {
    if (!query) return allItems;
    return allItems.filter((item) => fuzzyMatch(query, item));
  }, [query, allItems]);

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();

    // Recent section (only when no query)
    if (!query) {
      const recentItems = recent
        .map((id) => allItems.find((i) => i.id === id))
        .filter(Boolean) as CommandItem[];
      if (recentItems.length) map.set('Recent', recentItems);
    }

    SECTION_ORDER.forEach((section) => {
      const items = filtered.filter((i) => i.section === section);
      if (items.length) map.set(section, items);
    });
    return map;
  }, [filtered, recent, query, allItems]);

  // Flat list for keyboard nav
  const flatItems = useMemo(() => [...grouped.values()].flat(), [grouped]);

  const maxActiveIdx = Math.max(0, flatItems.length - 1);
  const activeIndex = Math.min(activeIdx, maxActiveIdx);

  const execute = useCallback(
    (item: CommandItem) => {
      pushRecent(item.id);
      if (item.route) void navigate({ to: item.route as Parameters<typeof navigate>[0]['to'] });
      else if (item.action) item.action();
      setOpen(false);
    },
    [navigate, setOpen],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(Math.min(i, maxActiveIdx) + 1, maxActiveIdx));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(Math.min(i, maxActiveIdx) - 1, 0));
    }
    if (e.key === 'Enter' && flatItems[activeIndex]) execute(flatItems[activeIndex]);
  };

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      className='fixed inset-0 z-200 flex items-start justify-center pt-[14vh]'
      role='presentation'
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}>
      <div
        className='mx-4 w-full max-w-140 overflow-hidden rounded-xl border border-border bg-card shadow-2xl'
        style={{ animation: 'cmd-in 0.12s cubic-bezier(.16,1,.3,1)' }}>
        {/* Search input */}
        <div className='flex h-14 items-center gap-3 border-b border-border px-4'>
          <IconSearch className='size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder='Search tools, actions, colors…'
            className='flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground'
            autoComplete='off'
            spellCheck={false}
          />
          <kbd className='shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground'>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className='max-h-100 overflow-y-auto py-1'>
          {grouped.size === 0 && (
            <div className='py-10 text-center text-[12px] text-muted-foreground'>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {[...grouped.entries()].map(([section, items]) => (
            <div key={section}>
              <div className='px-4 py-1.5 text-[9px] font-bold tracking-[0.12em] text-muted-foreground uppercase'>
                {section}
              </div>
              {items.map((item) => {
                const idx = globalIdx++;
                const isActive = idx === activeIndex;
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                    )}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => execute(item)}>
                    <ItemIcon
                      className='size-4 shrink-0 text-muted-foreground'
                      aria-hidden='true'
                    />
                    <span className='flex-1 text-sm text-foreground'>{item.label}</span>
                    <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] text-muted-foreground uppercase'>
                      {item.section}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className='flex h-9 items-center gap-3 border-t border-border px-4'>
          <span className='text-[9px] text-muted-foreground'>↑↓ navigate</span>
          <span className='text-[9px] text-muted-foreground'>↵ select</span>
          <span className='flex-1 text-[9px] text-muted-foreground'>esc close</span>
          <KbdGroup className='gap-1'>
            <Kbd className='h-4 min-w-0 rounded border border-border bg-background/50 px-1 font-mono text-[9px] font-medium text-muted-foreground'>
              {commandModifier}
            </Kbd>
            <Kbd className='h-4 min-w-0 rounded border border-border bg-background/50 px-1 font-mono text-[9px] font-medium text-muted-foreground'>
              K
            </Kbd>
          </KbdGroup>
        </div>
      </div>

      <style>{`
        @keyframes cmd-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
