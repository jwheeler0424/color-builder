import { createFileRoute } from "@tanstack/react-router";
import UtilityColorsView from "@/components/views/utility-colors-view";

export const Route = createFileRoute("/_chroma/export/utility")({
  component: UtilityColorsView,
});
