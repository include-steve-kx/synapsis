import { createEffect } from './effects';
import type { EffectNodeV2, GalleryRecipe } from './types';

export const BUILTIN_RECIPES: readonly GalleryRecipe[] = [
  { id: 'algae-glass', title: 'Algae Glass', creator: 'Synapsis', description: 'A living membrane refracts and illuminates the camera.', nodes: [
    { kind: 'culture', parameters: { p0: .4, p1: .58, p2: .76, p3: .52 } },
    { kind: 'flow', parameters: { p0: .28, p1: .08, p2: 1.4, p3: .18 } },
    { kind: 'displace', parameters: { p0: .055, p1: 11, p2: .22, p3: .7 } },
    { kind: 'bloom', parameters: { p0: .8, p1: .55, p2: 4, p3: .25 } },
  ]},
  { id: 'living-mosaic', title: 'Living Mosaic', creator: 'Synapsis', description: 'Responsive recursive panes remember movement.', nodes: [
    { kind: 'measure' }, { kind: 'divide' }, { kind: 'echo', parameters: { p0: .6 } }, { kind: 'edge' },
  ]},
  { id: 'sand-portrait', title: 'Sand Portrait', creator: 'Synapsis', description: 'Contours loosen into falling illuminated grains.', nodes: [
    { kind: 'edge' }, { kind: 'grain' }, { kind: 'palette', parameters: { p0: 3 } }, { kind: 'bloom', parameters: { p0: .45 } },
  ]},
  { id: 'curve-memory', title: 'Curve Memory', creator: 'Synapsis', description: 'A recursive circuit records a reduced-color past.', nodes: [
    { kind: 'path' }, { kind: 'echo', parameters: { p0: .82, p1: 1.5 } }, { kind: 'quantize' }, { kind: 'palette', parameters: { p0: 4 } },
  ]},
  { id: 'lava-signal', title: 'Lava Signal', creator: 'Synapsis', description: 'Viscous bodies fold the image into luminous heat.', nodes: [
    { kind: 'melt' }, { kind: 'fold', parameters: { p0: 3 } }, { kind: 'displace' }, { kind: 'bloom', parameters: { p0: 1.1 } },
  ]},
  { id: 'mycelium-camera', title: 'Mycelium Camera', creator: 'Synapsis', description: 'Agent trails seek edges and persist as light.', nodes: [
    { kind: 'trails' }, { kind: 'edge', parameters: { p0: .6 } }, { kind: 'bloom' }, { kind: 'echo', parameters: { p0: .72 } },
  ]},
  { id: 'cellular-echo', title: 'Cellular Echo', creator: 'Synapsis', description: 'Motion seeds a cellular memory field.', nodes: [
    { kind: 'difference' }, { kind: 'life' }, { kind: 'echo' }, { kind: 'palette', parameters: { p0: 2 } },
  ]},
  { id: 'fractal-organ', title: 'Fractal Organ', creator: 'Synapsis', description: 'Nested folds breathe through delayed color.', nodes: [
    { kind: 'fold', parameters: { p0: 4 } }, { kind: 'fold', parameters: { p0: 7, p1: 1.7 } }, { kind: 'echo' }, { kind: 'palette' },
  ]},
  { id: 'broken-broadcast', title: 'Broken Broadcast', creator: 'Synapsis', description: 'A low-resolution transmission tears through memory.', nodes: [
    { kind: 'quantize' }, { kind: 'difference' }, { kind: 'displace' }, { kind: 'echo' },
  ]},
  { id: 'fossil-screen', title: 'Fossil Screen', creator: 'Synapsis', description: 'Architectural fragments harden into printed strata.', nodes: [
    { kind: 'edge' }, { kind: 'divide' }, { kind: 'dither' }, { kind: 'palette', parameters: { p0: 0 } },
  ]},
  { id: 'liquid-pixels', title: 'Liquid Pixels', creator: 'Synapsis', description: 'Coarse image cells flow through translucent bodies.', nodes: [
    { kind: 'pixelate' }, { kind: 'melt' }, { kind: 'displace' }, { kind: 'bloom' },
  ]},
  { id: 'synthetic-terrain', title: 'Synthetic Terrain', creator: 'Synapsis', description: 'Measured brightness becomes warped topography.', nodes: [
    { kind: 'measure' }, { kind: 'contour' }, { kind: 'displace' }, { kind: 'palette', parameters: { p0: 5 } },
  ]},
] as const;

export function instantiateRecipe(recipe: GalleryRecipe): EffectNodeV2[] {
  return recipe.nodes.map((template) => createEffect(template.kind, template));
}
