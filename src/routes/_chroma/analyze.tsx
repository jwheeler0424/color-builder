import { Outlet, createFileRoute } from "@tanstack/react-router";

// Layout route for the Analyze section.
// URL: /analyze → children: /analyze/accessibility, /analyze/scoring, /analyze/visualize, /analyze/brand
export const Route = createFileRoute("/_chroma/analyze")({
  component: () => <Outlet />,
});
