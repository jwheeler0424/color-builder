import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createMiddleware } from "@tanstack/react-start";

const userLoggerMiddleware = createMiddleware().server(async ({ next }) => {
  console.info("In: /users");
  console.info("Request Headers:", getRequestHeaders());
  const result = await next();
  result.response.headers.set("x-users", "true");
  console.info("Out: /users");
  return result;
});

const testParentMiddleware = createMiddleware().server(async ({ next }) => {
  console.info("In: testParentMiddleware");
  const result = await next();
  result.response.headers.set("x-test-parent", "true");
  console.info("Out: testParentMiddleware");
  return result;
});

const testMiddleware = createMiddleware()
  .middleware([testParentMiddleware])
  .server(async ({ next }) => {
    console.info("In: testMiddleware");
    const result = await next();
    result.response.headers.set("x-test", "true");

    // if (Math.random() > 0.5) {
    //   throw new Response(null, {
    //     status: 302,
    //     headers: { Location: 'https://www.google.com' },
    //   })
    // }

    console.info("Out: testMiddleware");
    return result;
  });

export const Route = createFileRoute("/api/hello")({
  server: {
    middleware: [testMiddleware, userLoggerMiddleware],
    handlers: {
      GET: async ({ request }) => {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },
  },
});
