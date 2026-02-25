import { createFileRoute, redirect } from '@tanstack/react-router'

// Redirect /analyze → /analyze/accessibility (default sub-tab)
export const Route = createFileRoute('/_chroma/analyze/')({
  beforeLoad: () => { throw redirect({ to: '/analyze/accessibility' }) },
})
