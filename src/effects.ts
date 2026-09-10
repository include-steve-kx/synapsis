import type { EffectCategory, EffectDefinition, EffectKind, EffectNodeTemplate, EffectNodeV2, ProjectV2 } from './types';

const pct = (value: number) => `${Math.round(value * 100)}%`;
const int = (value: number) => `${Math.round(value)}`;

export const EFFECT_CATEGORIES: readonly { id: EffectCategory; name: string; description: string }[] = [
  { id: 'trace-print', name: 'Trace / Print', description: 'Edges, marks, glyphs, and print processes' },
  { id: 'pixel-structure', name: 'Pixel / Structure', description: 'Grids, sorting, fields, and fragmented geometry' },
  { id: 'color-light', name: 'Color / Light', description: 'Tone, palette, exposure, and illumination' },
  { id: 'space-optics', name: 'Space / Optics', description: 'Mirrors, lenses, folds, and spatial warping' },
  { id: 'time-signal', name: 'Time / Signal', description: 'Feedback, noise, scan processes, and broken media' },
  { id: 'organic-systems', name: 'Organic / Systems', description: 'Growth, matter, agents, and living fields' },
] as const;

export const EFFECTS: readonly EffectDefinition[] = [
  { kind: 'edge', category: 'trace-print', name: 'Edge Trace', description: 'Sobel outlines with an adjustable monochrome mix.', params: [
    { key: 'p0', name: 'Amount', min: 0, max: 1, step: .01, initial: .85, format: pct },
    { key: 'p1', name: 'Threshold', min: 0, max: 1, step: .01, initial: .22, format: pct },
    { key: 'p2', name: 'Thickness', min: .5, max: 4, step: .1, initial: 1.4 },
    { key: 'p3', name: 'Invert', min: 0, max: 1, step: 1, initial: 0, format: int },
  ]},
  { kind: 'pixelate', category: 'pixel-structure', name: 'Pixel Grid', description: 'Reduces the image into hard, adjustable cells.', params: [
    { key: 'p0', name: 'Cell size', min: 2, max: 96, step: 1, initial: 18, format: int },
    { key: 'p1', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
    { key: 'p2', name: 'Aspect', min: .25, max: 4, step: .05, initial: 1 },
    { key: 'p3', name: 'Posterize', min: 2, max: 16, step: 1, initial: 8, format: int },
  ]},
  { kind: 'dither', category: 'trace-print', name: 'Ordered Dither', description: 'Bayer-pattern print texture with color quantization.', params: [
    { key: 'p0', name: 'Scale', min: 1, max: 12, step: 1, initial: 3, format: int },
    { key: 'p1', name: 'Levels', min: 2, max: 10, step: 1, initial: 3, format: int },
    { key: 'p2', name: 'Pattern', min: 0, max: 1, step: .01, initial: .72, format: pct },
    { key: 'p3', name: 'Monochrome', min: 0, max: 1, step: .01, initial: 0, format: pct },
  ]},
  { kind: 'halftone', category: 'trace-print', name: 'Dot Press', description: 'Rotated print dots sampled from local brightness.', params: [
    { key: 'p0', name: 'Cell size', min: 3, max: 42, step: 1, initial: 12, format: int },
    { key: 'p1', name: 'Angle', min: -1.57, max: 1.57, step: .01, initial: .34 },
    { key: 'p2', name: 'Dot gain', min: .2, max: 1.8, step: .01, initial: 1 },
    { key: 'p3', name: 'Color', min: 0, max: 1, step: .01, initial: .2, format: pct },
  ]},
  { kind: 'ascii', category: 'trace-print', name: 'ASCII Matrix', description: 'Maps brightness to a live, customizable glyph atlas.', params: [
    { key: 'p0', name: 'Cell size', min: 7, max: 40, step: 1, initial: 15, format: int },
    { key: 'p1', name: 'Contrast', min: .3, max: 2.5, step: .01, initial: 1.2 },
    { key: 'p2', name: 'Color', min: 0, max: 1, step: .01, initial: .15, format: pct },
    { key: 'p3', name: 'Background', min: 0, max: .5, step: .01, initial: .03, format: pct },
  ]},
  { kind: 'glitch', category: 'time-signal', name: 'Signal Fault', description: 'Block displacement, RGB separation, and scan noise.', params: [
    { key: 'p0', name: 'Damage', min: 0, max: 1, step: .01, initial: .45, format: pct },
    { key: 'p1', name: 'RGB split', min: 0, max: 24, step: .5, initial: 5 },
    { key: 'p2', name: 'Block size', min: 4, max: 80, step: 1, initial: 28, format: int },
    { key: 'p3', name: 'Scanlines', min: 0, max: 1, step: .01, initial: .2, format: pct },
  ]},
  { kind: 'pixelSort', category: 'pixel-structure', name: 'Pixel Sort', description: 'Sorts contiguous tonal spans into directional streaks.', cost: 3, params: [
    { key: 'p0', name: 'Low threshold', min: 0, max: 1, step: .01, initial: .25, format: pct },
    { key: 'p1', name: 'Span limit', min: 8, max: 17, step: 1, initial: 16, format: (v) => v >= 16.5 ? 'FULL' : int(v) },
    { key: 'p2', name: 'Direction', min: 0, max: 3, step: 1, initial: 0, format: (v) => ['X →', 'Y ↑', 'X ←', 'Y ↓'][Math.round(v)] ?? 'X →' },
    { key: 'p3', name: 'High threshold', min: 0, max: 1, step: .01, initial: .8, format: pct },
  ]},
  { kind: 'echo', category: 'time-signal', name: 'Echo', description: 'Feedback trails from the prior processed frame.', usesHistory: true, params: [
    { key: 'p0', name: 'Decay', min: 0, max: .98, step: .01, initial: .78, format: pct },
    { key: 'p1', name: 'Drift X', min: -20, max: 20, step: .25, initial: 2 },
    { key: 'p2', name: 'Drift Y', min: -20, max: 20, step: .25, initial: 0 },
    { key: 'p3', name: 'Color drift', min: 0, max: 1, step: .01, initial: .08, format: pct },
  ]},
  { kind: 'slitScan', category: 'time-signal', name: 'Slit Scan', description: 'A moving slit writes the present into accumulated time.', usesHistory: true, params: [
    { key: 'p0', name: 'Width', min: .005, max: .3, step: .005, initial: .045, format: pct },
    { key: 'p1', name: 'Speed', min: .01, max: 1.5, step: .01, initial: .22 },
    { key: 'p2', name: 'Axis', min: 0, max: 1, step: 1, initial: 0, format: (v) => v < .5 ? 'X' : 'Y' },
    { key: 'p3', name: 'Feather', min: 0, max: .2, step: .005, initial: .02, format: pct },
  ]},
  { kind: 'bloom', category: 'color-light', name: 'Cold Bloom', description: 'Thresholded neighborhood glow for bright highlights.', params: [
    { key: 'p0', name: 'Strength', min: 0, max: 2, step: .01, initial: .7 },
    { key: 'p1', name: 'Threshold', min: 0, max: 1, step: .01, initial: .62, format: pct },
    { key: 'p2', name: 'Radius', min: .5, max: 8, step: .1, initial: 3 },
    { key: 'p3', name: 'Cool tint', min: 0, max: 1, step: .01, initial: .2, format: pct },
  ]},
  { kind: 'flow', category: 'space-optics', name: 'Touch Flow', description: 'Finger motion bends the image like a local force field.', params: [
    { key: 'p0', name: 'Radius', min: .03, max: .8, step: .01, initial: .25, format: pct },
    { key: 'p1', name: 'Force', min: -.5, max: .5, step: .005, initial: .12 },
    { key: 'p2', name: 'Twist', min: -4, max: 4, step: .02, initial: 1.1 },
    { key: 'p3', name: 'Pulse', min: 0, max: 1, step: .01, initial: .12, format: pct },
  ]},
  { kind: 'jumpFlood', category: 'pixel-structure', name: 'Jump Field', description: 'Multiscale nearest-feature field inspired by jump flooding.', params: [
    { key: 'p0', name: 'Cells', min: 6, max: 80, step: 1, initial: 26, format: int },
    { key: 'p1', name: 'Edge pull', min: 0, max: 1, step: .01, initial: .55, format: pct },
    { key: 'p2', name: 'Contours', min: 1, max: 24, step: 1, initial: 8, format: int },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .75, format: pct },
  ]},
  { kind: 'seamMelt', category: 'pixel-structure', name: 'Seam Melt', description: 'Energy-guided row compression preview inspired by seam carving.', params: [
    { key: 'p0', name: 'Compression', min: 0, max: .6, step: .01, initial: .18, format: pct },
    { key: 'p1', name: 'Energy', min: 0, max: 2, step: .01, initial: .8 },
    { key: 'p2', name: 'Wobble', min: 0, max: 1, step: .01, initial: .25, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .8, format: pct },
  ]},
  { kind: 'monochrome', category: 'color-light', name: 'Mono Signal', description: 'Tonal black-and-white conversion with tint and contrast.', params: [
    { key: 'p0', name: 'Contrast', min: .2, max: 3, step: .01, initial: 1.25 },
    { key: 'p1', name: 'Brightness', min: -.5, max: .5, step: .01, initial: 0 },
    { key: 'p2', name: 'Cold tint', min: 0, max: 1, step: .01, initial: .08, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'posterize', category: 'color-light', name: 'Posterize', description: 'Hard color bands with saturation and gamma shaping.', params: [
    { key: 'p0', name: 'Levels', min: 2, max: 24, step: 1, initial: 5, format: int },
    { key: 'p1', name: 'Saturation', min: 0, max: 2.5, step: .01, initial: 1.2 },
    { key: 'p2', name: 'Gamma', min: .25, max: 2.5, step: .01, initial: 1 },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'solarize', category: 'color-light', name: 'Solarize', description: 'Reverses tones around a movable exposure threshold.', params: [
    { key: 'p0', name: 'Threshold', min: 0, max: 1, step: .01, initial: .5, format: pct },
    { key: 'p1', name: 'Softness', min: .001, max: .4, step: .005, initial: .05 },
    { key: 'p2', name: 'Hue drift', min: -1, max: 1, step: .01, initial: .15 },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .9, format: pct },
  ]},
  { kind: 'thermal', category: 'color-light', name: 'Thermal Map', description: 'Maps luminance into a banded false-color heat palette.', params: [
    { key: 'p0', name: 'Exposure', min: .2, max: 2.5, step: .01, initial: 1.15 },
    { key: 'p1', name: 'Bands', min: 1, max: 32, step: 1, initial: 12, format: int },
    { key: 'p2', name: 'Shift', min: -1, max: 1, step: .01, initial: 0 },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'chroma', category: 'color-light', name: 'Chromatic Drift', description: 'Separates color channels radially or directionally.', params: [
    { key: 'p0', name: 'Distance', min: 0, max: 50, step: .5, initial: 9 },
    { key: 'p1', name: 'Angle', min: -3.14, max: 3.14, step: .01, initial: 0 },
    { key: 'p2', name: 'Radial', min: 0, max: 1, step: .01, initial: .35, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'kaleidoscope', category: 'space-optics', name: 'Kaleidoscope', description: 'Folds the camera around mirrored angular sectors.', params: [
    { key: 'p0', name: 'Segments', min: 2, max: 24, step: 1, initial: 8, format: int },
    { key: 'p1', name: 'Rotation', min: -3.14, max: 3.14, step: .01, initial: 0 },
    { key: 'p2', name: 'Zoom', min: .25, max: 3, step: .01, initial: 1.05 },
    { key: 'p3', name: 'Drift', min: -2, max: 2, step: .01, initial: .12 },
  ]},
  { kind: 'mirror', category: 'space-optics', name: 'Mirror Gate', description: 'Mirrors either side of an adjustable seam.', params: [
    { key: 'p0', name: 'Position', min: .05, max: .95, step: .01, initial: .5, format: pct },
    { key: 'p1', name: 'Axis', min: 0, max: 1, step: 1, initial: 0, format: (v) => v < .5 ? 'X' : 'Y' },
    { key: 'p2', name: 'Side', min: 0, max: 1, step: 1, initial: 0, format: (v) => v < .5 ? 'LEFT' : 'RIGHT' },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'ripple', category: 'space-optics', name: 'Ripple Lens', description: 'Animated circular waves bend the source around touch.', params: [
    { key: 'p0', name: 'Amplitude', min: 0, max: .12, step: .001, initial: .025 },
    { key: 'p1', name: 'Frequency', min: 2, max: 80, step: .5, initial: 28 },
    { key: 'p2', name: 'Speed', min: -5, max: 5, step: .05, initial: 1.4 },
    { key: 'p3', name: 'Radius', min: .05, max: 1.5, step: .01, initial: .7 },
  ]},
  { kind: 'fisheye', category: 'space-optics', name: 'Fisheye', description: 'Barrel or pinch distortion with an optical vignette.', params: [
    { key: 'p0', name: 'Curvature', min: -.9, max: 1.5, step: .01, initial: .45 },
    { key: 'p1', name: 'Zoom', min: .5, max: 2, step: .01, initial: 1.05 },
    { key: 'p2', name: 'Vignette', min: 0, max: 1, step: .01, initial: .2, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'crt', category: 'time-signal', name: 'CRT Terminal', description: 'Curved glass, scanlines, grille, and edge falloff.', params: [
    { key: 'p0', name: 'Curvature', min: 0, max: .4, step: .005, initial: .11 },
    { key: 'p1', name: 'Scanlines', min: 0, max: 1, step: .01, initial: .35, format: pct },
    { key: 'p2', name: 'Grille', min: 0, max: 1, step: .01, initial: .18, format: pct },
    { key: 'p3', name: 'Vignette', min: 0, max: 1, step: .01, initial: .45, format: pct },
  ]},
  { kind: 'noise', category: 'time-signal', name: 'Noise Field', description: 'Animated monochrome or chromatic sensor grain.', params: [
    { key: 'p0', name: 'Amount', min: 0, max: 1, step: .01, initial: .18, format: pct },
    { key: 'p1', name: 'Grain size', min: 1, max: 20, step: 1, initial: 2, format: int },
    { key: 'p2', name: 'Color', min: 0, max: 1, step: .01, initial: .12, format: pct },
    { key: 'p3', name: 'Speed', min: 0, max: 30, step: .5, initial: 12 },
  ]},
  { kind: 'datamosh', category: 'time-signal', name: 'Datamosh', description: 'Motion vectors drag recycled macroblocks through time.', usesHistory: true, animated: true, cost: 3, params: [
    { key: 'p0', name: 'Frame loss', min: 0, max: 1, step: .01, initial: .58, format: pct },
    { key: 'p1', name: 'Block size', min: 4, max: 100, step: 1, initial: 34, format: int },
    { key: 'p2', name: 'Motion gain', min: 0, max: 4, step: .05, initial: 1.5 },
    { key: 'p3', name: 'Persistence', min: 0, max: .995, step: .005, initial: .92, format: pct },
  ]},
  { kind: 'lowpoly', category: 'pixel-structure', name: 'Low Poly', description: 'Triangular camera sampling with faceted shading.', params: [
    { key: 'p0', name: 'Cell size', min: 8, max: 120, step: 1, initial: 36, format: int },
    { key: 'p1', name: 'Jitter', min: 0, max: 1, step: .01, initial: .22, format: pct },
    { key: 'p2', name: 'Facet shade', min: 0, max: 1, step: .01, initial: .28, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .9, format: pct },
  ]},
  { kind: 'cubism', category: 'pixel-structure', name: 'Cubist Blocks', description: 'Rotated local fragments rebuild the frame as planes.', params: [
    { key: 'p0', name: 'Block size', min: 12, max: 180, step: 1, initial: 58, format: int },
    { key: 'p1', name: 'Rotation', min: 0, max: 3.14, step: .01, initial: .8 },
    { key: 'p2', name: 'Displace', min: 0, max: 1, step: .01, initial: .35, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .85, format: pct },
  ]},
  { kind: 'doodle', category: 'trace-print', name: 'Doodle Ink', description: 'Sketchy animated contours over a paper-like field.', params: [
    { key: 'p0', name: 'Threshold', min: 0, max: 1, step: .01, initial: .16, format: pct },
    { key: 'p1', name: 'Thickness', min: .5, max: 5, step: .1, initial: 1.4 },
    { key: 'p2', name: 'Wobble', min: 0, max: 1, step: .01, initial: .3, format: pct },
    { key: 'p3', name: 'Source color', min: 0, max: 1, step: .01, initial: .12, format: pct },
  ]},
  { kind: 'prism', category: 'space-optics', name: 'Prism Fold', description: 'Radial facets split and recombine color around the center.', params: [
    { key: 'p0', name: 'Facets', min: 3, max: 32, step: 1, initial: 11, format: int },
    { key: 'p1', name: 'Split', min: 0, max: 35, step: .5, initial: 8 },
    { key: 'p2', name: 'Rotation', min: -3.14, max: 3.14, step: .01, initial: 0 },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .9, format: pct },
  ]},
  { kind: 'measure', category: 'trace-print', name: 'Measure', description: 'Reveals adjustable luminance and chroma relationships.', params: [
    { key: 'p0', name: 'Exposure', min: .1, max: 3, step: .01, initial: 1.1 },
    { key: 'p1', name: 'Contrast', min: .1, max: 4, step: .01, initial: 1.35 },
    { key: 'p2', name: 'Bias', min: -.5, max: .5, step: .01, initial: 0 },
    { key: 'p3', name: 'Color', min: 0, max: 1, step: .01, initial: .25, format: pct },
  ]},
  { kind: 'difference', category: 'time-signal', name: 'Difference', description: 'Extracts movement by comparing the present with memory.', usesHistory: true, cost: 2, params: [
    { key: 'p0', name: 'Gain', min: 0, max: 8, step: .05, initial: 2.5 },
    { key: 'p1', name: 'Threshold', min: 0, max: 1, step: .01, initial: .08, format: pct },
    { key: 'p2', name: 'Memory', min: 0, max: 1, step: .01, initial: .45, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .9, format: pct },
  ]},
  { kind: 'fold', category: 'space-optics', name: 'Fold', description: 'Recursively mirrors and repeats space into nested symmetry.', animated: true, params: [
    { key: 'p0', name: 'Folds', min: 1, max: 12, step: 1, initial: 5, format: int },
    { key: 'p1', name: 'Scale', min: .5, max: 4, step: .01, initial: 1.35 },
    { key: 'p2', name: 'Rotation', min: -3.14, max: 3.14, step: .01, initial: .25 },
    { key: 'p3', name: 'Drift', min: -2, max: 2, step: .01, initial: .08 },
  ]},
  { kind: 'divide', category: 'pixel-structure', name: 'Divide', description: 'Builds an adaptive recursive subdivision mosaic.', animated: true, params: [
    { key: 'p0', name: 'Depth', min: 1, max: 8, step: 1, initial: 4, format: int },
    { key: 'p1', name: 'Irregularity', min: 0, max: 1, step: .01, initial: .35, format: pct },
    { key: 'p2', name: 'Edge response', min: 0, max: 1, step: .01, initial: .7, format: pct },
    { key: 'p3', name: 'Lines', min: 0, max: 1, step: .01, initial: .4, format: pct },
  ]},
  { kind: 'cells', category: 'pixel-structure', name: 'Cells', description: 'Reconstructs the image through living Voronoi territories.', animated: true, cost: 2, params: [
    { key: 'p0', name: 'Density', min: 4, max: 80, step: 1, initial: 24, format: int },
    { key: 'p1', name: 'Jitter', min: 0, max: 1, step: .01, initial: .65, format: pct },
    { key: 'p2', name: 'Pulse', min: 0, max: 2, step: .01, initial: .25 },
    { key: 'p3', name: 'Borders', min: 0, max: 1, step: .01, initial: .35, format: pct },
  ]},
  { kind: 'gate', category: 'trace-print', name: 'Gate', description: 'Cuts the image into controllable tonal territories.', params: [
    { key: 'p0', name: 'Threshold', min: 0, max: 1, step: .01, initial: .5, format: pct },
    { key: 'p1', name: 'Softness', min: 0, max: .5, step: .005, initial: .04, format: pct },
    { key: 'p2', name: 'Invert', min: 0, max: 1, step: 1, initial: 0, format: int },
    { key: 'p3', name: 'Source', min: 0, max: 1, step: .01, initial: .15, format: pct },
  ]},
  { kind: 'soften', category: 'color-light', name: 'Soften', description: 'Diffuses the image while preserving a trace of its source.', cost: 2, params: [
    { key: 'p0', name: 'Radius', min: .5, max: 18, step: .25, initial: 4 },
    { key: 'p1', name: 'Iterations', min: 1, max: 4, step: 1, initial: 2, format: int },
    { key: 'p2', name: 'Preserve', min: 0, max: 1, step: .01, initial: .25, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: .85, format: pct },
  ]},
  { kind: 'displace', category: 'space-optics', name: 'Displace', description: 'Warps pixels through a procedural vector field.', animated: true, touch: true, params: [
    { key: 'p0', name: 'Strength', min: 0, max: .3, step: .002, initial: .045 },
    { key: 'p1', name: 'Scale', min: 1, max: 40, step: .25, initial: 9 },
    { key: 'p2', name: 'Speed', min: -3, max: 3, step: .02, initial: .3 },
    { key: 'p3', name: 'Touch', min: 0, max: 1, step: .01, initial: .65, format: pct },
  ]},
  { kind: 'palette', category: 'color-light', name: 'Palette', description: 'Maps luminance into a compact synthetic color system.', params: [
    { key: 'p0', name: 'Scheme', min: 0, max: 5, step: 1, initial: 1, format: int },
    { key: 'p1', name: 'Contrast', min: .2, max: 3, step: .01, initial: 1.3 },
    { key: 'p2', name: 'Phase', min: -1, max: 1, step: .01, initial: 0 },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'quantize', category: 'pixel-structure', name: 'Quantize', description: 'Reduces image space and tone into discrete units.', params: [
    { key: 'p0', name: 'Spatial', min: 1, max: 96, step: 1, initial: 12, format: int },
    { key: 'p1', name: 'Tonal', min: 2, max: 32, step: 1, initial: 6, format: int },
    { key: 'p2', name: 'Jitter', min: 0, max: 1, step: .01, initial: .08, format: pct },
    { key: 'p3', name: 'Mix', min: 0, max: 1, step: .01, initial: 1, format: pct },
  ]},
  { kind: 'contour', category: 'trace-print', name: 'Contour', description: 'Turns brightness into animated topographic isolines.', animated: true, params: [
    { key: 'p0', name: 'Bands', min: 2, max: 48, step: 1, initial: 12, format: int },
    { key: 'p1', name: 'Width', min: .005, max: .5, step: .005, initial: .12 },
    { key: 'p2', name: 'Drift', min: -2, max: 2, step: .01, initial: .08 },
    { key: 'p3', name: 'Source', min: 0, max: 1, step: .01, initial: .18, format: pct },
  ]},
  { kind: 'path', category: 'trace-print', name: 'Path', description: 'Draws a recursive space-filling circuit through the frame.', animated: true, params: [
    { key: 'p0', name: 'Order', min: 2, max: 8, step: 1, initial: 5, format: int },
    { key: 'p1', name: 'Width', min: .01, max: .5, step: .005, initial: .12 },
    { key: 'p2', name: 'Travel', min: -3, max: 3, step: .02, initial: .2 },
    { key: 'p3', name: 'Source', min: 0, max: 1, step: .01, initial: .4, format: pct },
  ]},
  { kind: 'melt', category: 'organic-systems', name: 'Melt', description: 'Pulls the camera through viscous metaball-like bodies.', animated: true, touch: true, cost: 2, params: [
    { key: 'p0', name: 'Bodies', min: 2, max: 14, step: 1, initial: 6, format: int },
    { key: 'p1', name: 'Viscosity', min: 0, max: 1, step: .01, initial: .6, format: pct },
    { key: 'p2', name: 'Motion', min: 0, max: 3, step: .02, initial: .45 },
    { key: 'p3', name: 'Refraction', min: 0, max: .2, step: .002, initial: .045 },
  ]},
  { kind: 'culture', category: 'organic-systems', name: 'Culture', description: 'Grows reaction-diffusion-like membranes from camera light.', animated: true, usesHistory: true, cost: 3, params: [
    { key: 'p0', name: 'Feed', min: 0, max: 1, step: .01, initial: .42, format: pct },
    { key: 'p1', name: 'Kill', min: 0, max: 1, step: .01, initial: .56, format: pct },
    { key: 'p2', name: 'Diffusion', min: 0, max: 1, step: .01, initial: .7, format: pct },
    { key: 'p3', name: 'Camera seed', min: 0, max: 1, step: .01, initial: .45, format: pct },
  ]},
  { kind: 'life', category: 'organic-systems', name: 'Life', description: 'Evolves camera-seeded cellular automata in a feedback field.', animated: true, usesHistory: true, cost: 2, params: [
    { key: 'p0', name: 'Cell size', min: 2, max: 24, step: 1, initial: 7, format: int },
    { key: 'p1', name: 'Birth', min: 1, max: 8, step: 1, initial: 3, format: int },
    { key: 'p2', name: 'Survival', min: 1, max: 8, step: 1, initial: 3, format: int },
    { key: 'p3', name: 'Camera seed', min: 0, max: 1, step: .01, initial: .35, format: pct },
  ]},
  { kind: 'grain', category: 'organic-systems', name: 'Grain', description: 'Lets image fragments fall like granular matter.', animated: true, usesHistory: true, touch: true, cost: 2, params: [
    { key: 'p0', name: 'Gravity', min: -2, max: 2, step: .02, initial: .65 },
    { key: 'p1', name: 'Cohesion', min: 0, max: 1, step: .01, initial: .3, format: pct },
    { key: 'p2', name: 'Cell size', min: 2, max: 24, step: 1, initial: 6, format: int },
    { key: 'p3', name: 'Camera seed', min: 0, max: 1, step: .01, initial: .5, format: pct },
  ]},
  { kind: 'trails', category: 'organic-systems', name: 'Trails', description: 'Agent-like traces follow light and accumulate over time.', animated: true, usesHistory: true, touch: true, cost: 3, params: [
    { key: 'p0', name: 'Population', min: 4, max: 64, step: 1, initial: 24, format: int },
    { key: 'p1', name: 'Sensing', min: 0, max: 1, step: .01, initial: .55, format: pct },
    { key: 'p2', name: 'Decay', min: 0, max: 1, step: .01, initial: .94, format: pct },
    { key: 'p3', name: 'Camera pull', min: 0, max: 1, step: .01, initial: .45, format: pct },
  ]},
  { kind: 'assembly', category: 'organic-systems', name: 'Assembly', description: 'Suspends sampled pixels as touch-reactive particles.', animated: true, touch: true, cost: 2, params: [
    { key: 'p0', name: 'Density', min: 4, max: 60, step: 1, initial: 18, format: int },
    { key: 'p1', name: 'Particle size', min: .05, max: 1, step: .01, initial: .45, format: pct },
    { key: 'p2', name: 'Disturbance', min: 0, max: 1, step: .01, initial: .65, format: pct },
    { key: 'p3', name: 'Drift', min: 0, max: 3, step: .02, initial: .35 },
  ]},
] as const;

export const effectDefinition = (kind: EffectKind) => EFFECTS.find((effect) => effect.kind === kind)!;

const uuid = (): string => globalThis.crypto?.randomUUID?.() ?? `syn-${Date.now()}-${Math.random()}`;
const seed = (): number => globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 0xffffffff);

export function createEffect(kind: EffectKind, template?: EffectNodeTemplate): EffectNodeV2 {
  const definition = effectDefinition(kind);
  const parameters = { p0: 0, p1: 0, p2: 0, p3: 0 } as EffectNodeV2['parameters'];
  for (const parameter of definition.params) parameters[parameter.key] = template?.parameters?.[parameter.key] ?? parameter.initial;
  if (kind === 'ascii') parameters.charset = template?.parameters?.charset ?? ' .:-=+*#%@';
  return {
    id: uuid(),
    kind,
    enabled: true,
    locked: false,
    seed: seed(),
    parameters,
  };
}

export function randomizeEffect(kind: EffectKind, random: () => number = Math.random): EffectNodeV2 {
  const instance = createEffect(kind);
  for (const parameter of effectDefinition(kind).params) {
    const raw = parameter.min + random() * (parameter.max - parameter.min);
    const snapped = Math.round(raw / parameter.step) * parameter.step;
    instance.parameters[parameter.key] = Number(Math.max(parameter.min, Math.min(parameter.max, snapped)).toFixed(4));
  }
  return instance;
}

export function randomEffectStack(count: number, random: () => number = Math.random): EffectNodeV2[] {
  const safeCount = Math.max(1, Math.min(6, Math.round(count)));
  const pool = EFFECTS.map((effect) => effect.kind);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }
  return pool.slice(0, safeCount).map((kind) => randomizeEffect(kind, random));
}

export const createProject = (name = 'Untitled signal', nodes: EffectNodeV2[] = [createEffect('edge'), createEffect('dither')]): ProjectV2 => {
  const now = new Date().toISOString();
  return { version: 2, id: uuid(), name, createdAt: now, updatedAt: now, seed: seed(), nodes };
};

export const DEFAULT_PROJECT: ProjectV2 = createProject();

export function isProject(value: unknown): value is ProjectV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProjectV2>;
  if (candidate.version !== 2 || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.createdAt !== 'string' || typeof candidate.updatedAt !== 'string' || !Number.isFinite(candidate.seed) || !Array.isArray(candidate.nodes)) return false;
  const kinds = new Set(EFFECTS.map((effect) => effect.kind));
  const parameterKeys = new Set(['p0', 'p1', 'p2', 'p3', 'charset']);
  return candidate.nodes.every((node) => Boolean(node) && typeof node === 'object' && typeof node.id === 'string' && kinds.has(node.kind) && typeof node.enabled === 'boolean' && typeof node.locked === 'boolean' && Number.isFinite(node.seed) && Boolean(node.parameters) && typeof node.parameters === 'object' && Object.keys(node.parameters).every((key) => parameterKeys.has(key)) && ['p0','p1','p2','p3'].every((key) => Number.isFinite(node.parameters[key as keyof typeof node.parameters])) && (node.parameters.charset === undefined || typeof node.parameters.charset === 'string'));
}

export function normalizeProject(project: ProjectV2): ProjectV2 {
  const normalized = structuredClone(project);
  normalized.name = normalized.name.slice(0, 60);
  normalized.updatedAt = new Date().toISOString();
  normalized.nodes.forEach((node) => {
    const definition = effectDefinition(node.kind);
    for (const parameter of definition.params) node.parameters[parameter.key] = Math.max(parameter.min, Math.min(parameter.max, node.parameters[parameter.key]));
    if (node.kind === 'ascii') node.parameters.charset = [...new Set([...(String(node.parameters.charset ?? ' .#'))])].slice(0, 24).join('') || ' .#';
  });
  return normalized;
}
