import { Outlet, createFileRoute } from "@tanstack/react-router";

// Layout route for the Build section.
// URL: /build → children: /build/mixer, /build/gradient, /build/extract
export const Route = createFileRoute("/_chroma/build")({
  component: () => <Outlet />,
});
