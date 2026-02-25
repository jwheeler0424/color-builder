import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /colorblind → /analyze/accessibility
export const Route = createFileRoute('/_chroma/colorblind')({
  beforeLoad: () => { throw redirect({ to: '/analyze/accessibility', replace: true }) },
})
