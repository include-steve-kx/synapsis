export type EffectKind =
  | 'edge'
  | 'pixelate'
  | 'dither'
  | 'halftone'
  | 'ascii'
  | 'glitch'
  | 'pixelSort'
  | 'echo'
  | 'slitScan'
  | 'bloom'
  | 'flow'
  | 'jumpFlood'
  | 'seamMelt'
  | 'monochrome'
  | 'posterize'
  | 'solarize'
  | 'thermal'
  | 'chroma'
  | 'kaleidoscope'
  | 'mirror'
  | 'ripple'
  | 'fisheye'
  | 'crt'
  | 'noise'
  | 'datamosh'
  | 'lowpoly'
  | 'cubism'
  | 'doodle'
  | 'prism'
  | 'measure'
  | 'difference'
  | 'fold'
  | 'divide'
  | 'cells'
  | 'gate'
  | 'soften'
  | 'displace'
  | 'palette'
  | 'quantize'
  | 'contour'
  | 'path'
  | 'melt'
  | 'culture'
  | 'life'
  | 'grain'
  | 'trails'
  | 'assembly';

export type EffectCategory =
  | 'trace-print'
  | 'pixel-structure'
  | 'color-light'
  | 'space-optics'
  | 'time-signal'
  | 'organic-systems';

export type ParameterKey = 'p0' | 'p1' | 'p2' | 'p3';

export interface ParameterDefinition {
  key: ParameterKey;
  name: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  format?: (value: number) => string;
}

export interface EffectDefinition {
  kind: EffectKind;
  category: EffectCategory;
  name: string;
  description: string;
  params: readonly ParameterDefinition[];
  usesHistory?: boolean;
  animated?: boolean;
  touch?: boolean;
  cost?: 1 | 2 | 3;
}

export interface EffectParameters extends Record<ParameterKey, number> {
  charset?: string;
}

export interface EffectNodeV2 {
  id: string;
  kind: EffectKind;
  enabled: boolean;
  locked: boolean;
  seed: number;
  parameters: EffectParameters;
}

export interface ProjectV2 {
  version: 2;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  seed: number;
  nodes: EffectNodeV2[];
}

export interface EffectNodeTemplate {
  kind: EffectKind;
  parameters?: Partial<EffectParameters>;
}

export interface GalleryRecipe {
  id: string;
  title: string;
  creator: string;
  description: string;
  nodes: EffectNodeTemplate[];
}

export interface PointerState {
  x: number;
  y: number;
  active: number;
  velocity: number;
}
