import { createFileRoute } from '@tanstack/react-router';

import { MarketingShell } from '@/components/marketing/marketing-shell';

export const Route = createFileRoute('/_marketing')({
  component: MarketingShell,
});
