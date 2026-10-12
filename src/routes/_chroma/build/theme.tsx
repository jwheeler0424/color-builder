import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

const ThemeOptimizerView = lazy(() => import('@/components/views/theme-optimizer-view'));

export const Route = createFileRoute('/_chroma/build/theme')({
  component: () => (
    <Suspense fallback={<div className='p-8 text-[12px] text-muted-foreground'>Loading…</div>}>
      <ThemeOptimizerView />
    </Suspense>
  ),
});