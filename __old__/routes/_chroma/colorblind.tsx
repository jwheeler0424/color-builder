import { createFileRoute } from "@tanstack/react-router";
import ColorBlindView from "@/components/views/color-blind-view";

export const Route = createFileRoute("/_chroma/colorblind")({
  component: ColorBlindView,
});
