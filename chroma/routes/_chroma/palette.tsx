import { createFileRoute } from '@tanstack/react-router'
import PaletteView from '../../src/chroma/components/PaletteView'

export const Route = createFileRoute('/_chroma/palette')({
  component: PaletteView,
})
