import { createFileRoute } from "@tanstack/react-router";
import ThemeGeneratorView from "@/components/views/theme-generator-view";

export const Route = createFileRoute("/_chroma/theme")({
  component: ThemeGeneratorView,
});
