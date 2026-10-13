import { createFileRoute } from '@tanstack/react-router';

import { DataPage } from '@/components/marketing/marketing-content';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/data')({
  head: () => ({
    meta: seo({
      title: 'Data & Privacy | Chroma ELITE',
      description:
        'Learn how the current Chroma color studio stores palettes, shares links, extracts images, and handles color-name requests.',
      keywords: 'Chroma privacy, local storage, color palette data',
    }),
  }),
  component: DataPage,
});
