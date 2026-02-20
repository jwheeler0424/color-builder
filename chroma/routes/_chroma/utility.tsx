import { createFileRoute } from '@tanstack/react-router'
import UtilityColorsView from '../../src/chroma/components/UtilityColorsView'

export const Route = createFileRoute('/_chroma/utility')({
  component: UtilityColorsView,
})
