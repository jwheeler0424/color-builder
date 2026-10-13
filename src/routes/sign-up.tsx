import { createFileRoute } from '@tanstack/react-router';

import { AuthPage } from '@/components/auth/auth-page';

export const Route = createFileRoute('/sign-up')({
  component: SignUpRoute,
});

function SignUpRoute() {
  return <AuthPage mode='sign-up' />;
}
