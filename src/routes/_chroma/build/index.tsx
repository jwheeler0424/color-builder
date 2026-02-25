import { createFileRoute, redirect } from '@tanstack/react-router'

// Redirect /build → /build/mixer (default sub-tab)
export const Route = createFileRoute('/_chroma/build/')({
  beforeLoad: () => { throw redirect({ to: '/build/mixer' }) },
})
