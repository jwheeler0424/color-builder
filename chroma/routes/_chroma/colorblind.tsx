import { createFileRoute } from '@tanstack/react-router'
import ColorBlindView from '../../src/chroma/components/ColorBlindView'

export const Route = createFileRoute('/_chroma/colorblind')({
  component: ColorBlindView,
})
