import { createFileRoute } from "@tanstack/react-router";
import ImageExtractView from "@/components/views/image-extract-view";

export const Route = createFileRoute("/_chroma/extract")({
  component: ImageExtractView,
});
