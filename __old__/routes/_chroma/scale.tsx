import { createFileRoute } from "@tanstack/react-router";
import TintScaleView from "@/components/views/tint-scale-view";

export const Route = createFileRoute("/_chroma/scale")({
  component: TintScaleView,
});
