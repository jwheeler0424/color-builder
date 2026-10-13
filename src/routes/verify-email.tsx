import { createFileRoute } from '@tanstack/react-router';

import { AuthPage } from '@/components/auth/auth-page';

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
  const { email } = Route.useSearch();
  return <AuthPage mode='verify-email' email={email} />;
}
