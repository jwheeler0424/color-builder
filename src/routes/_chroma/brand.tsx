import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /brand → /analyze/brand
export const Route = createFileRoute('/_chroma/brand')({
  beforeLoad: () => { throw redirect({ to: '/analyze/brand', replace: true }) },
})
