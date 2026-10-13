import { createFileRoute } from '@tanstack/react-router';

import { ChromaShell } from '@/components/chroma-shell';

// Pathless layout route — wraps the palette index, /picker, and other studio routes
// with the ChromaShell (header nav + modal layer) without adding a URL segment.
export const Route = createFileRoute('/_chroma')({
  component: ChromaShell,
});
