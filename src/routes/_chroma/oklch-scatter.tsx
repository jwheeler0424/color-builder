import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /oklch-scatter → /analyze/visualize
export const Route = createFileRoute('/_chroma/oklch-scatter')({
  beforeLoad: () => { throw redirect({ to: '/analyze/visualize', replace: true }) },
})
