import { createFileRoute } from "@tanstack/react-router";
import ConverterView from "@/components/views/converter-view";

export const Route = createFileRoute("/_chroma/converter")({
  component: ConverterView,
});
