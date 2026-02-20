import { createFileRoute } from "@tanstack/react-router";
import AccessibilityView from "@/components/views/accessibility-view";

export const Route = createFileRoute("/_chroma/accessibility")({
  component: AccessibilityView,
});
