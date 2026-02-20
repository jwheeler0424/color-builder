import { createFileRoute } from "@tanstack/react-router";
import PaletteView from "@/components/views/PaletteView";

export const Route = createFileRoute("/api/palette")({
  component: PaletteView,
});
