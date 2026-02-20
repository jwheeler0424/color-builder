import { createFileRoute } from '@tanstack/react-router'
import PaletteScoring from '../../src/chroma/components/PaletteScoring'

export const Route = createFileRoute('/_chroma/scoring')({
  component: PaletteScoring,
})
