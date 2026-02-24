import { createFileRoute } from "@tanstack/react-router";
import ColorPickerView from "@/components/views/color-picker-view";

export const Route = createFileRoute("/_chroma/picker")({
  component: ColorPickerView,
});
