import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /utility → /export/utility
export const Route = createFileRoute('/_chroma/utility')({
  beforeLoad: () => { throw redirect({ to: '/export/utility', replace: true }) },
})
