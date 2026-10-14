import { createFileRoute } from '@tanstack/react-router';

import { TermsOfUsePage } from '@/components/marketing/marketing-legal';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/terms')({
  head: () => ({
    meta: seo({
      title: 'Terms of Use | Chroma ELITE',
      description:
        'Terms for Chroma ELITE color tools, local saving, palette sharing, acceptable use, and current service availability.',
    }),
  }),
  component: TermsOfUsePage,
});
