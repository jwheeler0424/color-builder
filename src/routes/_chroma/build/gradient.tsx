import { createFileRoute } from "@tanstack/react-router";
import GradientView from "@/components/views/gradient-view";

export const Route = createFileRoute("/_chroma/build/gradient")({
  component: GradientView,
});
