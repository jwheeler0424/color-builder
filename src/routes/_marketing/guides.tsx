import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_marketing/guides')({
  beforeLoad: () => {
    throw redirect({ to: '/support', hash: 'guides', replace: true });
  },
});
