import { createFileRoute } from "@tanstack/react-router";
import CssPreview from "@/components/views/css-preview";

export const Route = createFileRoute("/_chroma/preview")({
  component: CssPreview,
});
