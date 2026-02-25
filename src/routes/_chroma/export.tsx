import { Outlet, createFileRoute } from "@tanstack/react-router";

// Layout route for the Export section.
// URL: /export → children: /export/scale, /export/designsystem, /export/theme, /export/utility
export const Route = createFileRoute("/_chroma/export")({
  component: () => <Outlet />,
});
