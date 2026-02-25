import { createFileRoute, redirect } from '@tanstack/react-router'

// Redirect /export → /export/scale (default sub-tab)
export const Route = createFileRoute('/_chroma/export/')({
  beforeLoad: () => { throw redirect({ to: '/export/scale' }) },
})
