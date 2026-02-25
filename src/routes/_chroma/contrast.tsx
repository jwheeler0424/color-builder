import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /contrast → /analyze/accessibility
export const Route = createFileRoute('/_chroma/contrast')({
  beforeLoad: () => { throw redirect({ to: '/analyze/accessibility', replace: true }) },
})
