import { createFileRoute } from '@tanstack/react-router'
import ColorPickerView from '../../src/chroma/components/ColorPickerView'

export const Route = createFileRoute('/_chroma/picker')({
  component: ColorPickerView,
})
