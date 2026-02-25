import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /theme → /export/theme
export const Route = createFileRoute('/_chroma/theme')({
  beforeLoad: () => { throw redirect({ to: '/export/theme', replace: true }) },
})
