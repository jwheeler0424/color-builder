import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /accessibility → /analyze/accessibility
export const Route = createFileRoute('/_chroma/accessibility')({
  beforeLoad: () => { throw redirect({ to: '/analyze/accessibility', replace: true }) },
})
