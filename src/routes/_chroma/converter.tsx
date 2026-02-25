import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /converter → /build/extract
export const Route = createFileRoute('/_chroma/converter')({
  beforeLoad: () => { throw redirect({ to: '/build/extract', replace: true }) },
})
