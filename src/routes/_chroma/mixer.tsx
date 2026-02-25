import { createFileRoute, redirect } from '@tanstack/react-router'
// Legacy redirect: /mixer → /build/mixer
export const Route = createFileRoute('/_chroma/mixer')({
  beforeLoad: () => { throw redirect({ to: '/build/mixer', replace: true }) },
})
