import { createFileRoute } from '@tanstack/react-router'
import SavedView from '../../src/chroma/components/SavedView'

export const Route = createFileRoute('/_chroma/saved')({
  component: SavedView,
})
