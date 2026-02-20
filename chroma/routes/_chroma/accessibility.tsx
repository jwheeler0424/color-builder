import { createFileRoute } from '@tanstack/react-router'
import AccessibilityView from '../../src/chroma/components/AccessibilityView'

export const Route = createFileRoute('/_chroma/accessibility')({
  component: AccessibilityView,
})
