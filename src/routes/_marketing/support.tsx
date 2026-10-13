import { createFileRoute } from '@tanstack/react-router';

import { SupportPage } from '@/components/marketing/marketing-content';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/support')({
  head: () => ({
    meta: seo({
      title: 'Help Center | Chroma ELITE',
      description:
        'Find practical answers about palette workflows, accessibility, exports, plans, API access, and local data.',
      keywords: 'Chroma help, color palette support, accessibility help, design token guides',
    }),
  }),
  component: SupportPage,
});
