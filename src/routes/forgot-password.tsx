import { createFileRoute } from '@tanstack/react-router';

import { AuthPage } from '@/components/auth/auth-page';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordRoute,
});

function ForgotPasswordRoute() {
  return <AuthPage mode='forgot-password' />;
}
