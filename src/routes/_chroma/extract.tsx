import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /extract → /build/extract
export const Route = createFileRoute('/_chroma/extract')({
  beforeLoad: () => { throw redirect({ to: '/build/extract', replace: true }) },
})
