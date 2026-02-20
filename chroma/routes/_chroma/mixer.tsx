import { createFileRoute } from '@tanstack/react-router'
import ColorMixer from '../../src/chroma/components/ColorMixer'

export const Route = createFileRoute('/_chroma/mixer')({
  component: ColorMixer,
})
