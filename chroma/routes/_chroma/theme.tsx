import { createFileRoute } from '@tanstack/react-router'
import ThemeGeneratorView from '../../src/chroma/components/ThemeGeneratorView'

export const Route = createFileRoute('/_chroma/theme')({
  component: ThemeGeneratorView,
})
