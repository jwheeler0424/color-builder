import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /scoring → /analyze/scoring
export const Route = createFileRoute('/_chroma/scoring')({
  beforeLoad: () => { throw redirect({ to: '/analyze/scoring', replace: true }) },
})
