import { createFileRoute } from "@tanstack/react-router";
import { ChromaShell } from "@/components/chroma-shell";

// Pathless layout route — wraps all /palette, /picker, etc. routes
// with the ChromaShell (header nav + modal layer) without adding a URL segment.
export const Route = createFileRoute("/_chroma")({
  component: ChromaShell,
});
