import { createFileRoute } from '@tanstack/react-router'
import ContrastChecker from '../../src/chroma/components/ContrastChecker'

export const Route = createFileRoute('/_chroma/contrast')({
  component: ContrastChecker,
})
