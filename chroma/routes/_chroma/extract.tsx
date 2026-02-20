import { createFileRoute } from '@tanstack/react-router'
import ImageExtractView from '../../src/chroma/components/ImageExtractView'

export const Route = createFileRoute('/_chroma/extract')({
  component: ImageExtractView,
})
