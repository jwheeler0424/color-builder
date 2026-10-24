import { createFileRoute } from '@tanstack/react-router';

import { DataPage } from '@/components/marketing/marketing-content';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/data')({
  head: () => ({
    meta: seo({
      title: 'Data & Privacy | Chroma ELITE',
      description:
        'Learn how Chroma ELITE handles browser-local palettes, shared links, images, and color-name requests.',
      keywords: 'Chroma data practices, local storage, palette privacy, image processing',
    }),
  }),
  component: DataPage,
});
