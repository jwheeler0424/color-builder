import { createFileRoute } from "@tanstack/react-router";
import PaletteView from "@/components/views/palette-view";

export const Route = createFileRoute("/api/palette")({
  component: PaletteView,
});
