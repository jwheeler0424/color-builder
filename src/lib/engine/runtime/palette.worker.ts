import { composePalette, type PaletteCompositionConfig } from '../compose.ts';
import { loadOptimalSolid, optimalGenerators, optimalSlabs } from '../gamuts/optimal.ts';
import { generateEnginePalette, type EnginePaletteConfig } from '../palette.ts';

self.onmessage = (
  event: MessageEvent<
    | { type: 'slabs'; startGenerator: number; endGenerator: number }
    | { type: 'palettes'; configs: EnginePaletteConfig[]; solid?: ArrayBuffer }
    | { type: 'compose'; config: PaletteCompositionConfig; solid?: ArrayBuffer }
  >,
) => {
  if (event.data.type === 'slabs') {
    const slabs = optimalSlabs(
      optimalGenerators(),
      event.data.startGenerator,
      event.data.endGenerator,
    );
    self.postMessage({ type: 'slabs', slabs }, [slabs.buffer as ArrayBuffer]);
    return;
  }
  if (event.data.solid) loadOptimalSolid(event.data.solid);
  if (event.data.type === 'compose') {
    self.postMessage({ type: 'compose', colors: composePalette(event.data.config) });
    return;
  }
  self.postMessage({
    type: 'palettes',
    palettes: event.data.configs.map((config) => generateEnginePalette(config)),
  });
};
