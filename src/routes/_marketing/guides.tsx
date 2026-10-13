import { createFileRoute } from '@tanstack/react-router';

import { GuidesPage } from '@/components/marketing/marketing-content';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/guides')({
  head: () => ({
    meta: seo({
      title: 'Color Design Guides | Chroma ELITE',
      description:
        'Practical guides to building accessible palettes, reading contrast, creating gradients, and exporting design tokens.',
      keywords: 'color design guide, WCAG contrast, OKLCH, design tokens, Tailwind colors',
    }),
  }),
  component: GuidesPage,
});
