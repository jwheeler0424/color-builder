import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { describe, expect, mock, test } from 'bun:test';
import { useState, type ComponentType } from 'react';

import type { ColorValue } from '@/lib/engine/color';

import HexInput from '@/components/common/hex-input';
import { ToolEmptyState } from '@/components/global/tool-empty-state';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast, ToasterGlobal } from '@/components/ui/toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import ColorMixer from '@/components/views/color-mixer';
import { TokenLegend } from '@/components/views/css-preview';
import {
  AccessibilityPanel,
  UtilityThemeCard,
  WorkspacePreview,
} from '@/components/views/design-system-view';
import ExtractView from '@/components/views/extract.view';
import GradientView from '@/components/views/gradient-view';
import ThemeGeneratorView from '@/components/views/theme-generator-view';
import ThemeOptimizerView from '@/components/views/theme-optimizer-view';
import UtilityColorsView, { buildUtilityCss } from '@/components/views/utility-colors-view';
import { ToolButton, ToolSegments, ToolTabs } from '@/components/views/view-ui';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { useStackedPalette } from '@/hooks/use-stacked-palette';
import {
  deriveThemeTokens,
  generateUtilityColors,
  hexToStop,
  parseColor,
  textColor,
  VISION_TYPES,
} from '@/lib/engine/browser';
import { ShellProvider } from '@/providers/shell.provider';

test('palette rows follow phone and tablet orientation without stacking desktop palettes', () => {
  const originalMatchMedia = window.matchMedia;
  const portraitQuery = Object.assign(new EventTarget(), {
    matches: true,
    media: '(orientation: portrait)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  });
  window.matchMedia = mock(() => portraitQuery);

  function LayoutProbe() {
    return <output>{useStackedPalette() ? 'rows' : 'columns'}</output>;
  }

  try {
    const view = render(
      <ShellProvider shell='tablet'>
        <LayoutProbe />
      </ShellProvider>,
    );
    expect(view.getByRole('status')).toHaveTextContent('rows');

    act(() => {
      portraitQuery.matches = false;
      portraitQuery.dispatchEvent(new Event('change'));
    });
    expect(view.getByRole('status')).toHaveTextContent('columns');

    view.rerender(
      <ShellProvider shell='mobile'>
        <LayoutProbe />
      </ShellProvider>,
    );
    expect(view.getByRole('status')).toHaveTextContent('rows');

    act(() => {
      portraitQuery.matches = true;
      portraitQuery.dispatchEvent(new Event('change'));
    });
    view.rerender(
      <ShellProvider shell='studio'>
        <LayoutProbe />
      </ShellProvider>,
    );
    expect(view.getByRole('status')).toHaveTextContent('columns');
    view.unmount();
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});

function colorValues(slots: { color: { hex: string; value?: ColorValue } }[]): ColorValue[] {
  return slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex));
}

function themeForSlots(slots: { color: { hex: string; value?: ColorValue } }[]) {
  const palette = colorValues(slots);
  return deriveThemeTokens(palette, generateUtilityColors(palette));
}

describe('build tools', () => {
  async function renderTool(Component: ComponentType) {
    const router = createRouter({
      routeTree: createRootRoute({ component: () => <Component /> }),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    const view = render(<RouterProvider router={router} />);
    await waitFor(() => expect(view.container.querySelector('h2')).toBeInTheDocument());
    return view;
  }

  test('mixer keeps narrow blend steps readable and swaps the input colors', async () => {
    const view = await renderTool(ColorMixer);
    const blends = view.getAllByRole('button', { name: /^Copy blend / });
    expect(blends).toHaveLength(7);
    expect(blends[0]!.parentElement).toHaveClass('grid-cols-1', '@min-[28rem]:grid-cols-7');
    const inputA = view.getByRole('textbox', { name: 'Color A hex' }) as HTMLInputElement;
    const inputB = view.getByRole('textbox', { name: 'Color B hex' }) as HTMLInputElement;
    const originalA = inputA.value;
    const originalB = inputB.value;
    const swap = view.getByRole('button', { name: 'Swap colors' });
    expect(swap).toHaveClass('order-2');
    fireEvent.click(swap);
    expect(inputA).toHaveValue(originalB);
    expect(inputB).toHaveValue(originalA);
  });

  test('gradient uses aligned embedded tabs and one vertical scroll area', async () => {
    const view = await renderTool(GradientView);
    const tabs = view.getByRole('tablist', { name: 'Gradient controls' });
    expect(tabs).not.toHaveClass('pl-4');
    expect(view.container.querySelectorAll('[class~="overflow-auto"]')).toHaveLength(1);
    fireEvent.click(within(tabs).getByRole('tab', { name: 'Stops' }));
    expect(view.getByRole('textbox', { name: 'Selected stop hex' })).toBeInTheDocument();
    const colorVision = view.getByRole('checkbox', { name: 'Color vision' });
    expect(colorVision).toBeChecked();
    expect(view.getAllByRole('img', { name: /gradient preview/i })).toHaveLength(
      VISION_TYPES.length,
    );
    fireEvent.click(colorVision);
    expect(colorVision).not.toBeChecked();
    expect(view.getAllByRole('img', { name: /gradient preview/i })).toHaveLength(1);
    fireEvent.click(colorVision);
    expect(view.getAllByRole('img', { name: /gradient preview/i })).toHaveLength(
      VISION_TYPES.length,
    );
  });

  test('extraction shares its scroll area and exposes the converter', async () => {
    const view = await renderTool(ExtractView);
    const grid = view.container.querySelector('[data-extract-layout-grid]');
    expect(grid).toHaveClass('@min-[56rem]/extract-view:grid-rows-[max-content]');
    expect(grid).not.toHaveClass('@min-[56rem]/extract-view:overflow-hidden');
    expect(view.container.querySelector('.extract-results')).not.toHaveClass(
      '@min-[56rem]/extract-view:overflow-y-auto',
    );
    fireEvent.click(view.getByRole('tab', { name: 'Convert' }));
    expect(view.getByRole('textbox', { name: 'Source color' })).toBeInTheDocument();
    expect(view.getByText('HEX')).toBeInTheDocument();
  });

  test('theme optimizer switches contrast standards without applying palette changes', async () => {
    const view = await renderTool(ThemeOptimizerView);
    const light = view.getByRole('heading', { name: 'light theme' }).closest('section')!;
    const dark = view.getByRole('heading', { name: 'dark theme' }).closest('section')!;
    expect(light.parentElement).toHaveClass('@5xl/theme-optimizer:grid-cols-2');
    expect((light.parentElement as HTMLElement).style.getPropertyValue('--theme-rows')).toBe(
      String(useChromaStore.getState().slots.length + 1),
    );
    for (const panel of [light, dark]) {
      expect(panel).toHaveClass(
        '@5xl/theme-optimizer:grid-rows-subgrid',
        '@5xl/theme-optimizer:row-span-(--theme-rows)',
      );
      expect(panel).not.toHaveClass('@container/theme-mode');
      expect(panel.lastElementChild).toHaveClass('@5xl/theme-optimizer:contents');
      for (const card of panel.querySelectorAll('article')) {
        expect(card.children).toHaveLength(5);
        expect(card.lastElementChild).toHaveClass('min-h-6');
      }
    }
    fireEvent.click(view.getByRole('button', { name: 'APCA' }));
    const target = view.getByRole('combobox', { name: 'APCA target' });
    expect(target).toHaveValue('45');
    fireEvent.change(target, { target: { value: '60' } });
    expect(target).toHaveValue('60');
    fireEvent.click(view.getByRole('button', { name: 'WCAG AA · 4.5:1' }));
    expect(view.queryByRole('combobox', { name: 'APCA target' })).not.toBeInTheDocument();
  });
});

test('tool empty state preserves wrapper classes, optional heading and guidance text', () => {
  const message = 'Generate a palette first to see your theme.';
  const view = render(
    <ToolEmptyState
      className='min-h-0 flex-1 overflow-auto'
      title='Theme Generator'
      message={message}
    />,
  );

  expect(view.getByRole('heading', { name: 'Theme Generator' })).toBeInTheDocument();
  expect(view.container.firstElementChild).toHaveClass('min-h-0', 'flex-1', 'overflow-auto');
  expect(view.getByText(message)).toHaveClass('text-xs', 'text-muted-foreground');

  view.rerender(
    <ToolEmptyState
      className='flex-1 px-4 py-4 3xl:px-6 3xl:py-5 4xl:px-7 4xl:py-6'
      message='Generate a palette first.'
    />,
  );

  expect(view.queryByRole('heading')).not.toBeInTheDocument();
  expect(view.container.firstElementChild).toHaveClass(
    'px-4',
    'py-4',
    '3xl:px-6',
    '3xl:py-5',
    '4xl:px-7',
    '4xl:py-6',
    'flex-1',
  );
});

test('tool controls expose selected tabs and support arrow, Home and End navigation', () => {
  function Controls() {
    const [value, setValue] = useState<'gradient' | 'stops' | 'presets'>('gradient');
    return (
      <ToolTabs
        value={value}
        onValueChange={setValue}
        label='Gradient controls'
        items={[
          { id: 'gradient', label: 'Gradient' },
          { id: 'stops', label: 'Stops' },
          { id: 'presets', label: 'Presets' },
        ]}
      />
    );
  }
  const view = render(<Controls />);
  const gradient = view.getByRole('tab', { name: 'Gradient' });
  expect(gradient).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(gradient, { key: 'End' });
  expect(view.getByRole('tab', { name: 'Presets' })).toHaveAttribute('aria-selected', 'true');
  expect(view.getByRole('tab', { name: 'Presets' })).toHaveFocus();
  fireEvent.keyDown(view.getByRole('tab', { name: 'Presets' }), { key: 'ArrowLeft' });
  expect(view.getByRole('tab', { name: 'Stops' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(view.getByRole('tab', { name: 'Stops' }), { key: 'Home' });
  expect(gradient).toHaveFocus();
  expect(gradient).toHaveAttribute('tabindex', '0');
});

test('tool controls preserve compact button styling, selection and disabled semantics', () => {
  const change = mock();
  const view = render(
    <>
      <ToolSegments
        value='srgb'
        onValueChange={change}
        label='Color space'
        items={[
          { id: 'srgb', label: 'sRGB' },
          { id: 'oklab', label: 'OKLab' },
        ]}
      />
      <ToolButton disabled size='sm'>
        Copy CSS
      </ToolButton>
    </>,
  );
  expect(view.getByRole('button', { name: 'sRGB' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(view.getByRole('button', { name: 'OKLab' }));
  expect(change).toHaveBeenCalledWith('oklab');
  expect(view.getByRole('button', { name: 'Copy CSS' })).toBeDisabled();
  expect(view.getByRole('button', { name: 'Copy CSS' }).className).toContain('text-2xs');
});

test('token hex input labels and swatches follow external mode and revert values', () => {
  const change = mock();
  const view = render(<HexInput value='#123456' onChange={change} aria-label='light --primary' />);
  expect(view.getByRole('textbox', { name: 'light --primary' })).toHaveValue('#123456');
  view.rerender(<HexInput value='#abcdef' onChange={change} aria-label='dark --primary' />);
  const input = view.getByRole('textbox', { name: 'dark --primary' });
  expect(input).toHaveValue('#abcdef');
  expect(view.container.querySelector('div[style]')).toHaveStyle({ background: '#abcdef' });
  fireEvent.change(input, { target: { value: '#zzzzzz' } });
  expect(change).not.toHaveBeenCalled();
  fireEvent.blur(input);
  expect(input).toHaveValue('#abcdef');
  expect(view.container.querySelector('div[style]')).toHaveStyle({ background: '#abcdef' });
});

test('workspace preview uses semantic and utility colors in both theme modes', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `preview-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots);
  for (const mode of ['light', 'dark'] as const) {
    const view = render(
      <WorkspacePreview
        tokens={tokens.semantic}
        slots={slots}
        utility={tokens.utility}
        mode={mode}
      />,
    );
    const background = tokens.semantic.find((token) => token.name === '--background')![mode];
    const primary = tokens.semantic.find((token) => token.name === '--primary')![mode];
    expect(view.container.querySelector('[data-component-preview]')).toHaveStyle({ background });
    expect(view.getByRole('button', { name: 'New project' })).toHaveStyle({ background: primary });
    expect(view.getByText('Active', { exact: true })).toHaveStyle({
      background: tokens.utility.info[mode === 'light' ? 'subtle' : 'subtleDark'],
      color: tokens.utility.info[mode],
    });
    expect(view.container.querySelectorAll('[data-preview-project]')).toHaveLength(4);
    view.unmount();
  }
});

test('workspace preview supports search, filters, creation, selection and activity', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `preview-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots);
  const view = render(
    <WorkspacePreview
      tokens={tokens.semantic}
      slots={slots}
      utility={tokens.utility}
      mode='light'
    />,
  );
  fireEvent.change(view.getByRole('searchbox', { name: 'Search projects' }), {
    target: { value: 'Brand' },
  });
  expect(view.container.querySelectorAll('[data-preview-project]')).toHaveLength(1);
  fireEvent.change(view.getByRole('searchbox', { name: 'Search projects' }), {
    target: { value: '' },
  });
  fireEvent.click(view.getByRole('button', { name: 'Completed' }));
  expect(view.container.querySelectorAll('[data-preview-project]')).toHaveLength(1);
  fireEvent.click(view.getByRole('button', { name: 'All projects' }));
  fireEvent.click(view.getByRole('button', { name: 'New project' }));
  expect(view.getByRole('button', { name: 'Create project' })).toBeDisabled();
  fireEvent.change(view.getByLabelText('Project name'), { target: { value: 'Launch checklist' } });
  fireEvent.click(view.getByRole('button', { name: 'Create project' }));
  expect(view.container.querySelectorAll('[data-preview-project]')).toHaveLength(5);
  fireEvent.click(view.getByRole('checkbox', { name: 'Select Launch checklist' }));
  fireEvent.click(view.getByRole('button', { name: 'Delete selected' }));
  expect(view.container.querySelectorAll('[data-preview-project]')).toHaveLength(4);
  fireEvent.click(view.getByRole('button', { name: 'Activity' }));
  expect(view.getByRole('heading', { name: 'Team activity' })).toBeInTheDocument();
});

test('workspace preview landing and settings pages retain working theme controls', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `preview-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots);
  const view = render(
    <WorkspacePreview
      tokens={tokens.semantic}
      slots={slots}
      utility={tokens.utility}
      mode='dark'
    />,
  );
  fireEvent.click(view.getByRole('button', { name: 'Landing' }));
  expect(view.getByRole('heading', { name: /in orbit/ })).toBeInTheDocument();
  expect(view.getByText('$16', { exact: true })).toBeInTheDocument();
  fireEvent.click(view.getByRole('button', { name: 'Yearly' }));
  expect(view.getByText('$12', { exact: true })).toBeInTheDocument();
  fireEvent.click(view.getByRole('button', { name: 'Get started' }));
  expect(view.getByLabelText('Project name')).toBeInTheDocument();
  fireEvent.click(view.getByRole('button', { name: 'Settings' }));
  fireEvent.change(view.getByLabelText('Full name'), { target: { value: 'Taylor Reed' } });
  fireEvent.click(view.getByRole('checkbox', { name: /Weekly digest/ }));
  fireEvent.click(view.getByRole('button', { name: 'Save changes' }));
  expect(view.getByRole('status')).toHaveTextContent('Preferences saved');
  fireEvent.click(view.getByRole('button', { name: 'Reset workspace' }));
  expect(view.getByRole('button', { name: 'Confirm reset' })).toBeInTheDocument();
  fireEvent.click(view.getByRole('button', { name: 'Confirm reset' }));
  expect(view.getByLabelText('Full name')).toHaveValue('Avery James');
  expect(view.getByRole('checkbox', { name: /Weekly digest/ })).not.toBeChecked();
  fireEvent.click(view.getByRole('button', { name: 'Projects' }));
  expect(view.container.querySelectorAll('[data-preview-project]')).toHaveLength(4);
  expect(view.queryByLabelText('Project name')).not.toBeInTheDocument();
});

test('design token utility card displays matching light and dark accent/surface values', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `utility-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots);
  const view = render(<UtilityThemeCard colorRole='info' utility={tokens.utility} mode='dark' />);
  expect(view.container.querySelector('[data-utility-preview="light"]')).toHaveStyle({
    background: tokens.utility.info.subtle,
    color: tokens.utility.info.light,
  });
  expect(view.container.querySelector('[data-utility-preview="dark"]')).toHaveStyle({
    background: tokens.utility.info.subtleDark,
    color: tokens.utility.info.dark,
  });
  expect(
    view.getByRole('button', { name: `Copy info base ${tokens.utility.info.base}` }),
  ).toBeInTheDocument();
  expect(
    view.getByRole('button', { name: `Copy info dark subtle ${tokens.utility.info.subtleDark}` }),
  ).toBeInTheDocument();
});

test('design token accessibility separates normal/large AA and uses the matching card foreground', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `contrast-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots).semantic.map((token) => ({
    ...token,
    light:
      token.name === '--primary-foreground'
        ? '#888888'
        : token.name === '--card-foreground'
          ? '#ffffff'
          : token.name.endsWith('foreground')
            ? '#000000'
            : '#ffffff',
  }));
  const view = render(<AccessibilityPanel tokens={tokens} mode='light' />);
  expect(view.getByLabelText('light normal text AA')).toHaveAttribute('data-passing-count', '5');
  expect(view.getByLabelText('light normal text AAA')).toHaveAttribute('data-passing-count', '5');
  expect(view.getByLabelText('light large text AA')).toHaveAttribute('data-passing-count', '6');
  expect(view.container.querySelector('[data-contrast-pair="Body text / card"]')).toHaveTextContent(
    '1.00:1',
  );
  expect(view.container.querySelector('[data-contrast-pair="Body text / card"]')).toHaveTextContent(
    'Fail',
  );
  expect(view.container.querySelectorAll('[data-contrast-pair]')).toHaveLength(7);
});

test('design token accessibility uses distinct theme surfaces and readable inspector text', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `surface-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots).semantic.map((token) =>
    token.name === '--foreground' ? { ...token, light: '#ffffff', dark: '#000000' } : token,
  );
  for (const mode of ['light', 'dark'] as const) {
    const view = render(<AccessibilityPanel tokens={tokens} mode={mode} />);
    const surface = tokens.find((token) => token.name === '--background')![mode];
    const panel = view.container.querySelector<HTMLElement>('[data-accessibility-mode]')!;
    expect(panel).toHaveStyle({ background: surface, color: textColor(parseColor(surface).xyz) });
    expect(panel.style.getPropertyValue('--foreground')).toBe(textColor(parseColor(surface).xyz));
    expect(
      view.getByRole('heading', { name: mode === 'light' ? 'Light theme' : 'Dark theme' }),
    ).toBeInTheDocument();
    expect(panel.querySelectorAll('[data-contrast-pair]')).toHaveLength(7);
    view.unmount();
  }
});

test('CSS preview keeps realistic sample-page navigation synchronized across themes', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `linked-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots);
  function Comparison() {
    const [page, setPage] = useState<'landing' | 'projects' | 'activity' | 'settings'>('projects');
    return (
      <>
        {(['light', 'dark'] as const).map((mode) => (
          <WorkspacePreview
            key={mode}
            tokens={tokens.semantic}
            slots={slots}
            utility={tokens.utility}
            mode={mode}
            page={page}
            onPageChange={setPage}
          />
        ))}
      </>
    );
  }
  const view = render(<Comparison />);
  fireEvent.click(view.getAllByRole('button', { name: 'Settings' })[0]);
  expect(view.getAllByRole('heading', { name: 'Workspace settings' })).toHaveLength(2);
  fireEvent.click(view.getAllByRole('button', { name: 'Landing' })[1]);
  expect(view.getAllByRole('heading', { name: /Keep every project in orbit/ })).toHaveLength(2);
});

test('CSS token inspector covers all semantic roles, filters and copies selected-mode values', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `inspector-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const tokens = themeForSlots(slots);
  const copy = mock();
  const view = render(<TokenLegend tokens={tokens} mode='dark' onCopy={copy} />);
  expect(view.container.querySelectorAll('[data-token-role]')).toHaveLength(tokens.semantic.length);
  view.rerender(<TokenLegend tokens={tokens} mode='dark' query='--primary' onCopy={copy} />);
  expect(view.container.querySelectorAll('[data-token-role]')).toHaveLength(4);
  const primary = tokens.semantic.find((token) => token.name === '--primary')!.dark;
  fireEvent.click(view.getByRole('button', { name: `Copy dark --primary ${primary}` }));
  expect(copy).toHaveBeenCalledWith('dark:--primary', primary);
  view.rerender(<TokenLegend tokens={tokens} mode='dark' query='unmatched-token' onCopy={copy} />);
  expect(view.getByText('No matching tokens.')).toBeInTheDocument();
});

test('theme workspace token edits update the live preview and can be reverted', () => {
  const view = render(<ThemeGeneratorView />);
  fireEvent.click(
    within(view.getByRole('group', { name: 'Theme sample page' })).getByRole('button', {
      name: 'Projects',
    }),
  );
  const preview = view.container.querySelector<HTMLElement>('[data-theme-mode="light"]')!;
  const original = within(preview).getByRole('button', { name: 'New project' }).style.background;
  fireEvent.click(
    within(view.getByRole('tablist', { name: 'Theme inspector' })).getByRole('tab', {
      name: 'Tokens',
    }),
  );
  fireEvent.change(view.getByRole('searchbox', { name: 'Search theme tokens' }), {
    target: { value: '--primary' },
  });
  fireEvent.change(view.getByRole('textbox', { name: 'Theme light --primary' }), {
    target: { value: '#e63946' },
  });
  expect(within(preview).getByRole('button', { name: 'New project' })).toHaveStyle({
    background: '#e63946',
  });
  fireEvent.click(view.getByRole('button', { name: 'Revert --primary' }));
  expect(within(preview).getByRole('button', { name: 'New project' }).style.background).toBe(
    original,
  );
  fireEvent.click(
    within(view.getByRole('group', { name: 'Theme preview mode' })).getByRole('button', {
      name: 'Split',
    }),
  );
  expect(view.container.querySelectorAll('[data-theme-mode]')).toHaveLength(2);
});

test('export utility workspace edits roles, rejects invalid hex and preserves locks during regeneration', async () => {
  const previous = useChromaStore.getState().utilityColors;
  const previousLocks = useChromaStore.getState().utilityLocks;
  const view = render(<UtilityColorsView />);
  try {
    const input = view.getByRole('textbox', { name: 'Info base hex' });
    fireEvent.change(input, { target: { value: '#e63946' } });
    expect(useChromaStore.getState().utilityColors.info.hex).toBe('#e63946');
    fireEvent.change(input, { target: { value: '#zzzzzz' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(useChromaStore.getState().utilityColors.info.hex).toBe('#e63946');
    fireEvent.blur(input);
    expect(input).toHaveValue('#e63946');
    if (useChromaStore.getState().utilityLocks.info)
      fireEvent.click(view.getByRole('button', { name: 'Unlock Info' }));
    fireEvent.click(view.getByRole('button', { name: 'Lock Info' }));
    const beforeRegeneration = useChromaStore.getState().utilityColors;
    fireEvent.click(view.getByRole('button', { name: 'Regenerate all' }));
    const regenerated = useChromaStore.getState().utilityColors;
    for (const role of Object.keys(beforeRegeneration) as (keyof typeof beforeRegeneration)[]) {
      if (useChromaStore.getState().utilityLocks[role])
        expect(regenerated[role]).toEqual(beforeRegeneration[role]);
      else expect(regenerated[role].hex).not.toBe(beforeRegeneration[role].hex);
    }
    expect(useChromaStore.getState().utilityColors.info.hex).toBe('#e63946');
    expect(useChromaStore.getState().utilityLocks.info).toBe(true);
    fireEvent.click(view.getByRole('button', { name: 'Select Focus' }));
    expect(view.getByRole('textbox', { name: 'Focus base hex' })).toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-utility-theme]')).toHaveLength(2);
  } finally {
    view.unmount();
    await act(async () => {
      useChromaStore.setState({ utilityColors: previous, utilityLocks: previousLocks });
    });
  }
});

test('utility CSS exports preserve base variables and include both themed accent/subtle variants', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex, index) => ({
    id: `utility-export-${index}`,
    color: hexToStop(hex),
    locked: false,
  }));
  const palette = colorValues(slots);
  const colors = generateUtilityColors(palette);
  const tokens = deriveThemeTokens(palette, colors);
  const base = buildUtilityCss(colors, tokens.utility, 'base');
  expect(base).toContain(`--info: ${colors.info.hex};`);
  expect(base.match(/--[a-z]+:/g)).toHaveLength(6);
  const themed = buildUtilityCss(colors, tokens.utility, 'themed');
  expect(themed).toContain(`--info: ${tokens.utility.info.light};`);
  expect(themed).toContain(`--info-subtle: ${tokens.utility.info.subtle};`);
  expect(themed).toContain(`--info: ${tokens.utility.info.dark};`);
  expect(themed).toContain(`--info-subtle: ${tokens.utility.info.subtleDark};`);
  expect(themed).toContain('.dark {');
});

describe('Base UI drawer', () => {
  test('labels its popup and reports close state', () => {
    const onOpenChange = mock();
    const view = render(
      <Drawer defaultOpen onOpenChange={onOpenChange}>
        <DrawerTrigger>Open tools</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Palette tools</DrawerTitle>
          <DrawerDescription>Choose a palette tool.</DrawerDescription>
          <DrawerClose>Close tools</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = view.getByRole('dialog', { name: 'Palette tools' });
    expect(popup).toHaveAttribute('data-swipe-direction', 'down');
    fireEvent.click(view.getByRole('button', { name: 'Close tools' }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  test('supports native side direction and non-modal state', () => {
    const view = render(
      <Drawer defaultOpen swipeDirection='right' modal={false}>
        <DrawerContent>
          <DrawerTitle>Side tools</DrawerTitle>
          <DrawerDescription>Side panel</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );
    expect(view.getByRole('dialog')).toHaveAttribute('data-swipe-direction', 'right');
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeInTheDocument();
  });
});

test('Base UI OTP renders real input slots with controlled values', () => {
  const view = render(
    <>
      <label htmlFor='verification-code'>Verification code</label>
      <InputOTP id='verification-code' maxLength={4} value='1234'>
        <InputOTPGroup>
          {[0, 1, 2, 3].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </>,
  );
  expect(view.getAllByRole('textbox').map((input) => (input as HTMLInputElement).value)).toEqual([
    '1',
    '2',
    '3',
    '4',
  ]);
  expect(view.getByRole('textbox', { name: 'Verification code' })).toHaveAttribute(
    'autocomplete',
    'one-time-code',
  );
});

test('Base UI popover exposes its label and contents', () => {
  const view = render(
    <Popover defaultOpen>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent aria-label='Tool navigation'>
        <a href='/'>Palette</a>
      </PopoverContent>
    </Popover>,
  );
  expect(view.getByRole('dialog', { name: 'Tool navigation' })).toBeInTheDocument();
  expect(view.getByRole('link', { name: 'Palette' })).toHaveAttribute('href', '/');
});

test('Base UI toast manager renders and dismisses a notification', () => {
  const view = render(<ToasterGlobal timeout={0} />);
  let id = '';
  act(() => {
    id = toast.add({ title: 'Palette saved', description: 'Saved locally', type: 'success' });
  });
  expect(view.getByText('Palette saved')).toBeInTheDocument();
  act(() => {
    view.getByRole('dialog', { name: 'Palette saved' }).focus();
  });
  expect(view.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
  act(() => {
    toast.close(id);
  });
});

test('checkbox and switch expose checked and disabled semantics', () => {
  const view = render(
    <>
      <Checkbox defaultChecked aria-label='Lock palette' />
      <Switch defaultChecked disabled aria-label='System theme' />
    </>,
  );
  expect(view.getByRole('checkbox', { name: 'Lock palette' })).toBeChecked();
  expect(view.getByRole('switch', { name: 'System theme' })).toBeChecked();
  expect(view.getByRole('switch', { name: 'System theme' })).toBeDisabled();
});

test('tabs forward vertical orientation and selection', () => {
  const view = render(
    <Tabs defaultValue='rgb' orientation='vertical'>
      <TabsList>
        <TabsTrigger value='rgb'>RGB</TabsTrigger>
        <TabsTrigger value='hsl'>HSL</TabsTrigger>
      </TabsList>
      <TabsContent value='rgb'>RGB controls</TabsContent>
      <TabsContent value='hsl'>HSL controls</TabsContent>
    </Tabs>,
  );
  expect(view.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  expect(view.getByRole('tab', { name: 'RGB' })).toHaveAttribute('aria-selected', 'true');
  expect(view.getByText('RGB controls')).toBeInTheDocument();
});

test('toggle groups expose native pressed state', () => {
  const view = render(
    <ToggleGroup defaultValue={['rgb']} orientation='vertical'>
      <ToggleGroupItem value='rgb'>RGB</ToggleGroupItem>
      <ToggleGroupItem value='hsl'>HSL</ToggleGroupItem>
    </ToggleGroup>,
  );
  expect(view.getByRole('button', { name: 'RGB' })).toHaveAttribute('aria-pressed', 'true');
  expect(view.getByRole('button', { name: 'RGB' })).toHaveAttribute('data-pressed');
});

test('select exposes its labelled trigger and current value', () => {
  const view = render(
    <Select
      defaultValue='oklab'
      items={[
        { value: 'oklab', label: 'OKLab' },
        { value: 'rgb', label: 'RGB' },
      ]}>
      <SelectTrigger aria-label='Color space'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='oklab'>OKLab</SelectItem>
        <SelectItem value='rgb'>RGB</SelectItem>
      </SelectContent>
    </Select>,
  );
  expect(view.getByRole('combobox', { name: 'Color space' })).toHaveTextContent('OKLab');
});

test('calendar renders the current month grid with Base UI buttons', () => {
  const view = render(<Calendar mode='single' defaultMonth={new Date(2026, 9, 1)} />);
  expect(view.getByRole('grid')).toBeInTheDocument();
  expect(view.container.querySelector('[data-slot="button"]')).toBeInTheDocument();
});

test('command search uses a labelled Base UI dialog', () => {
  const view = render(
    <CommandDialog defaultOpen title='Palette commands'>
      <Command>
        <CommandInput placeholder='Search tools' />
        <CommandList>
          <CommandItem value='palette'>Palette</CommandItem>
        </CommandList>
      </Command>
    </CommandDialog>,
  );
  expect(view.getByRole('dialog', { name: 'Palette commands' })).toBeInTheDocument();
  expect(view.getByRole('combobox')).toBeInTheDocument();
});
