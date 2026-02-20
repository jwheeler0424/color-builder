import { createFileRoute } from "@tanstack/react-router";
import SavedView from "@/components/views/saved-view";

export const Route = createFileRoute("/_chroma/saved")({
  component: SavedView,
});
