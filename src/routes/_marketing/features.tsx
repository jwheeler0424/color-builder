import { createFileRoute } from '@tanstack/react-router';

import { FeaturesPage } from '@/components/marketing/marketing-pages';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/features')({
  head: () => ({
    meta: seo({
      title: 'Features | Chroma ELITE Color Design Studio',
      description:
        'Build, evaluate, and export color systems with perceptual color tools and accessibility checks.',
      keywords: 'color palette, OKLCH, WCAG, design tokens, color system',
    }),
  }),
  component: FeaturesPage,
});
