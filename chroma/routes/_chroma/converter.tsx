import { createFileRoute } from '@tanstack/react-router'
import ConverterView from '../../src/chroma/components/ConverterView'

export const Route = createFileRoute('/_chroma/converter')({
  component: ConverterView,
})
