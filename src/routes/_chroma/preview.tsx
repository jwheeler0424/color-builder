import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /preview → /export/designsystem
export const Route = createFileRoute('/_chroma/preview')({
  beforeLoad: () => { throw redirect({ to: '/export/designsystem', replace: true }) },
})
