import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /scale → /export/scale
export const Route = createFileRoute('/_chroma/scale')({
  beforeLoad: () => { throw redirect({ to: '/export/scale', replace: true }) },
})
