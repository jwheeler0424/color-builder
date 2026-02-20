import { createFileRoute } from '@tanstack/react-router'
import GradientView from '../../src/chroma/components/GradientView'

export const Route = createFileRoute('/_chroma/gradient')({
  component: GradientView,
})
