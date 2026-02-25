import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /multiscale → /export/scale
export const Route = createFileRoute('/_chroma/multiscale')({
  beforeLoad: () => { throw redirect({ to: '/export/scale', replace: true }) },
})
