import { createFileRoute } from '@tanstack/react-router';

import { PricingPage } from '@/components/marketing/marketing-pages';
import { seo } from '@/lib/utils/seo';

export const Route = createFileRoute('/_marketing/pricing')({
  head: () => ({
    meta: seo({
      title: 'Pricing | Chroma ELITE Color Design Studio',
      description:
        'Start with a useful free color workflow, then unlock every Chroma tool with Pro or Team.',
      keywords: 'Chroma pricing, color design tools, design system pricing',
    }),
  }),
  component: PricingPage,
});
