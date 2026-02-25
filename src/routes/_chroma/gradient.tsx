import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /gradient → /build/gradient
export const Route = createFileRoute('/_chroma/gradient')({
  beforeLoad: () => { throw redirect({ to: '/build/gradient', replace: true }) },
})
