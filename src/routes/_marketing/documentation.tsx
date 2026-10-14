import { createFileRoute } from '@tanstack/react-router';

import { DocumentationPage } from '@/components/marketing/marketing-content';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/documentation')({
  head: () => ({
    meta: seo({
      title: 'Documentation | Chroma ELITE',
      description:
        'Explore documentation for the Chroma ELITE application shell, design system, and styles.',
      keywords: 'Chroma ELITE documentation, design system, application shell, styles',
    }),
  }),
  component: DocumentationPage,
});
