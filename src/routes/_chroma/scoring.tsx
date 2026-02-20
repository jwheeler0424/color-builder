import { createFileRoute } from "@tanstack/react-router";
import PaletteScoring from "@/components/views/palette-scoring";

export const Route = createFileRoute("/_chroma/scoring")({
  component: PaletteScoring,
});
