import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /p3 → /analyze/visualize
export const Route = createFileRoute('/_chroma/p3')({
  beforeLoad: () => { throw redirect({ to: '/analyze/visualize', replace: true }) },
})
