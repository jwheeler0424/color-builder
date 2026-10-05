/**
 * tokens.view.tsx  — Phase 1 merge
 *
 * Combines: design-system-view + css-preview
 * Sub-tabs:  [Tokens] [CSS Preview]
 *
 * Both sub-components are large self-contained views. Rather than inlining
 * all their internals, we import and render them as lazy panels under a
 * shared tab bar.  This keeps this file thin and delegates to the existing
 * components — they continue to work normally if navigated to directly
 * via their old routes during the migration window.
 */

import { Suspense, lazy, useState } from 'react';

import { ToolTabs, ViewHeader } from './view-ui';

// Lazily import the two sub-views so they don't affect each other's bundle
const DesignSystemView = lazy(() => import('./design-system-view'));
const CssPreview = lazy(() => import('./css-preview'));

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'tokens' | 'preview';

function TabBar({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  return (
    <ToolTabs
      value={active}
      onValueChange={setActive}
      label='Tokens and preview'
      items={[
        { id: 'tokens', label: 'Design Tokens' },
        { id: 'preview', label: 'CSS Preview' },
      ]}
    />
  );
}

const fallback = (
  <div className='flex flex-1 items-center justify-center text-[12px] text-muted-foreground'>
    Loading…
  </div>
);

// ─── Root export ──────────────────────────────────────────────────────────────

export default function TokensView() {
  const [activeTab, setActiveTab] = useState<Tab>('tokens');
  return (
    <div className='@container/tokens flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Tokens & Preview'
        description='Semantic color values for light and dark themes.'
      />
      <TabBar active={activeTab} setActive={setActiveTab} />
      <Suspense fallback={fallback}>
        {activeTab === 'tokens' && <DesignSystemView />}
        {activeTab === 'preview' && <CssPreview />}
      </Suspense>
    </div>
  );
}
