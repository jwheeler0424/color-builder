import { serve } from "bun";
import { readdirSync } from "node:fs";

import index from "./index.html";

const publicDirectory = new URL("../public/", import.meta.url);
const publicRoutes = Object.fromEntries(
  readdirSync(publicDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => [
      `/${entry.name}`,
      new Response(Bun.file(new URL(entry.name, publicDirectory))),
    ]),
);

const server = serve({
  routes: {
    ...publicRoutes,
    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
