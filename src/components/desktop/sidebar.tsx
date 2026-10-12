import { IconMenu2 as MenuIcon } from '@tabler/icons-react';
import { createContext, useCallback, useContext, useState } from 'react';

/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils';

import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SidebarSide = 'left' | 'right';
export type SidebarVariant = 'push' | 'overlay';

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
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SidebarProvider({
  children,
  defaultOpen = true,
  side = 'left',
  variant = 'push',
  width = 260,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen, side, variant, width, toggle, open, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

// ─── Layout wrapper (scoped container) ───────────────────────────────────────

export function SidebarLayout({ children, className = '', style }: SidebarLayoutProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─── Sidebar panel ────────────────────────────────────────────────────────────

export function Sidebar({ children, header, footer, className = '' }: SidebarProps) {
  const { isOpen, side, variant, width } = useSidebar();

  const translateX = isOpen ? '0' : side === 'left' ? `-${width}px` : `${width}px`;

  return (
    <>
      {/* Overlay backdrop for overlay variant */}
      {variant === 'overlay' && (
        <div
          aria-hidden='true'
          className={cn(
            'pointer-events-none absolute inset-0 z-40 bg-black/45 opacity-0 backdrop-blur-xs transition-opacity duration-300',
            isOpen && 'pointer-events-auto opacity-100',
          )}
        />
      )}

      <aside
        className={cn(
          `top-0 bottom-0 [${side}]-0 relative z-auto flex shrink-0 flex-col overflow-hidden border-x border-x-border/40 bg-background transition-all duration-300 ease-in-out`,
          `translate-x-[${translateX}] w-[${width}px] min-w-[${width}px]`,
          side === 'left' && 'border-l-0',
          side === 'right' && 'border-r-0',
          variant === 'overlay' && 'absolute z-50',
          className,
        )}>
        {header && <div className='shrink-0 border-b border-b-border/40 px-4 py-5'>{header}</div>}

        <div className='flex-1 overflow-y-auto px-0 py-3'>{children}</div>

        {footer && <div className='shrink-0 border-t border-t-border/40 px-5 py-3'>{footer}</div>}
      </aside>
    </>
  );
}

// ─── Main content area ────────────────────────────────────────────────────────

export function SidebarContent({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <main
      className={cn(
        'min-w-0 flex-1 overflow-y-auto transition-[flex] duration-300 ease-in-out',
        className,
      )}
      style={style}>
      {children}
    </main>
  );
}

// ─── Trigger button ───────────────────────────────────────────────────────────

export function SidebarTrigger({ className = '', children }: SidebarTriggerProps) {
  const { toggle, isOpen, side } = useSidebar();

  return (
    <Button
      onClick={toggle}
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      size={'icon'}
      variant={'ghost'}
      className={cn('text-muted-foreground', className)}>
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
            `px-5 pt-1.5 pb-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase`,
            className,
          )}>
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
      variant={'ghost'}
      size={'sm'}
      className={cn(
        'mr-1 flex w-full cursor-pointer items-center gap-2.5',
        active && `border-l-2 border-l-accent bg-secondary font-semibold`,
        className,
      )}>
      {icon && (
        <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7, display: 'flex' }}>{icon}</span>
      )}
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
        {label}
      </span>
      {badge !== undefined && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: 10,
            background: active ? 'var(--sidebar-accent, #6366f1)' : '#23262f',
            color: active ? '#fff' : '#9ca3af',
            fontFamily: 'monospace',
          }}>
          {badge}
        </span>
      )}
    </Button>
  );
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────

// ─── Separator ────────────────────────────────────────────────────────────────

export function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot='sidebar-separator'
      data-sidebar='separator'
      className={cn('mx-2 w-auto bg-sidebar-border', className)}
      {...props}
    />
  );
}
