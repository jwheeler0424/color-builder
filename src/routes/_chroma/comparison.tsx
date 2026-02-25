import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /comparison → /analyze/scoring
export const Route = createFileRoute('/_chroma/comparison')({
  beforeLoad: () => { throw redirect({ to: '/analyze/scoring', replace: true }) },
})
