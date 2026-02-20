import { createFileRoute } from "@tanstack/react-router";
import ContrastChecker from "@/components/views/contrast-checker";

export const Route = createFileRoute("/_chroma/contrast")({
  component: ContrastChecker,
});
