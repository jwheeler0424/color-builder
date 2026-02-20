import { createFileRoute } from '@tanstack/react-router'
import CssPreview from '../../src/chroma/components/CssPreview'

export const Route = createFileRoute('/_chroma/preview')({
  component: CssPreview,
})
