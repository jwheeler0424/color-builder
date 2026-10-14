import { createFileRoute } from '@tanstack/react-router';

import { PrivacyPolicyPage } from '@/components/marketing/marketing-legal';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/privacy')({
  head: () => ({
    meta: seo({
      title: 'Privacy Policy | Chroma ELITE',
      description: `Privacy practices for Chroma ELITE, operated by Designer's Image, including browser storage, shared palettes, and color-name requests.`,
    }),
  }),
  component: PrivacyPolicyPage,
});
