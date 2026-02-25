import { createFileRoute } from "@tanstack/react-router";
import ColorMixer from "@/components/views/color-mixer";

export const Route = createFileRoute("/_chroma/build/mixer")({
  component: ColorMixer,
});
