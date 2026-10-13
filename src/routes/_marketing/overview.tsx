import { createFileRoute } from '@tanstack/react-router';

import { OverviewPage } from '@/components/marketing/marketing-content';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/overview')({
  head: () => ({
    meta: seo({
      title: 'Chroma ELITE | Color Design Studio',
      description:
        'Explore palettes, check accessibility, build color systems, and export design tokens with Chroma ELITE.',
      keywords: 'color design studio, color palette, OKLCH, accessibility, design tokens',
    }),
  }),
  component: OverviewPage,
});
