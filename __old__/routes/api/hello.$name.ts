import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/hello/$name")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        console.info(`Fetching users by id=${params.name}... @`, request.url);
        return Response.json({
          message: `Hello, ${params.name}!`,
        });
      },
    },
  },
});
