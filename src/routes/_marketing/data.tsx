import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_marketing/data')({
  beforeLoad: () => {
    throw redirect({ to: '/support', hash: 'data', replace: true });
  },
});
