import { createFileRoute } from '@tanstack/react-router';

import { ApiPage } from '@/components/marketing/marketing-content';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/api')({
  head: () => ({
    meta: seo({
      title: 'Color API for Developers | Chroma ELITE',
      description:
        'Explore the planned Chroma API for palette generation, color analysis, and design-system workflows.',
      keywords: 'color API, palette API, color developer API, design tokens API',
    }),
  }),
  component: ApiPage,
});
