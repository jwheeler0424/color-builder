import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /designsystem → /export/designsystem
export const Route = createFileRoute('/_chroma/designsystem')({
  beforeLoad: () => { throw redirect({ to: '/export/designsystem', replace: true }) },
})
