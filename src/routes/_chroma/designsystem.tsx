import { createFileRoute } from "@tanstack/react-router";
import DesignSystemView from "@/components/views/design-system-view";

export const Route = createFileRoute("/_chroma/designsystem")({
  component: DesignSystemView,
});
