import { serve } from 'bun';
import lcmsWasmUrl from 'lcms-wasm/dist/lcms.wasm' with { type: 'file' };
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import index from './index.html';
import { handleColorNames } from './lib/tools/color-names.server';

const publicDirectory = new URL('../public/', import.meta.url);
const workerBundle = await Bun.build({
  entrypoints: [fileURLToPath(new URL('./lib/engine/runtime/palette.worker.ts', import.meta.url))],
  target: 'browser',
  minify: true,
});
if (!workerBundle.success)
  throw new AggregateError(workerBundle.logs, 'Could not bundle the palette worker.');
const publicRoutes = Object.fromEntries(
  readdirSync(publicDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => [
      `/${entry.name}`,
      new Response(Bun.file(new URL(entry.name, publicDirectory))),
    ]),
);

const server = serve({
  maxRequestBodySize: 64 * 1024,
  routes: {
    ...publicRoutes,
    '/lcms.wasm': new Response(Bun.file(lcmsWasmUrl), {
      headers: { 'Content-Type': 'application/wasm' },
    }),
    '/api/color-names': handleColorNames,
    '/palette-worker.js': new Response(workerBundle.outputs[0], {
      headers: { 'Content-Type': 'text/javascript' },
    }),
    '/optimal-solid.bin': new Response(
      Bun.file(new URL('./lib/engine/data/optimal-solid.bin', import.meta.url)),
      { headers: { 'Content-Type': 'application/octet-stream' } },
    ),
    // Serve index.html for all unmatched routes.
    '/*': index,
  },

  development: process.env.NODE_ENV !== 'production' && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
