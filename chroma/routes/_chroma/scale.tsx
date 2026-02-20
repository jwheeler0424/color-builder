import { createFileRoute } from '@tanstack/react-router'
import TintScaleView from '../../src/chroma/components/TintScaleView'

export const Route = createFileRoute('/_chroma/scale')({
  component: TintScaleView,
})
