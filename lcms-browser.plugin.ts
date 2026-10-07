import type { BunPlugin } from 'bun';

const lcmsBrowserPlugin: BunPlugin = {
  name: 'lcms-browser-loader',
  setup(build) {
    if (build.config.target !== 'browser') return;
    build.onResolve({ filter: /^module$/ }, (args) => {
      if (!args.importer.replaceAll('\\', '/').includes('/lcms-wasm/')) return undefined;
      return { path: 'module', namespace: 'lcms-node-loader' };
    });
    build.onLoad({ filter: /^module$/, namespace: 'lcms-node-loader' }, () => ({
      loader: 'js',
      contents:
        'export function createRequire() { throw new Error("Little-CMS Node loader cannot run in a browser."); }',
    }));
  },
};

export default lcmsBrowserPlugin;
