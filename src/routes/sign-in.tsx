import { createFileRoute } from '@tanstack/react-router';

import { AuthPage } from '@/components/auth/auth-page';

export const Route = createFileRoute('/sign-in')({
  component: SignInRoute,
});

function SignInRoute() {
  return <AuthPage mode='sign-in' />;
}
