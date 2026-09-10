import { describe, expect, it } from 'vitest';
import { createEffect, createProject, EFFECT_CATEGORIES, EFFECTS, effectDefinition, isProject, normalizeProject, randomizeEffect, randomEffectStack } from './effects';
import { BUILTIN_RECIPES, instantiateRecipe } from './gallery';
import { isFrontFacingCamera } from './camera';

describe('Synapsis v2 effect catalogue', () => {
  it('has unique kinds and four controls per node', () => {
    expect(new Set(EFFECTS.map((effect) => effect.kind)).size).toBe(EFFECTS.length);
    expect(EFFECTS.every((effect) => effect.params.length === 4)).toBe(true);
  });

  it('places every node in exactly one visible library category', () => {
    const categoryIds = EFFECT_CATEGORIES.map((category) => category.id);
    expect(new Set(categoryIds).size).toBe(categoryIds.length);
    expect(EFFECTS.every((effect) => categoryIds.includes(effect.category))).toBe(true);
    expect(EFFECT_CATEGORIES.every((category) => EFFECTS.some((effect) => effect.category === category.id))).toBe(true);
  });

  it('creates independent, seeded, flat nodes', () => {
    const first = createEffect('ascii');
    const second = createEffect('ascii');
    expect(first.id).not.toBe(second.id);
    expect(first.seed).not.toBe(second.seed);
    expect(first.parameters.charset).toBeTruthy();
    expect(Object.values(first).some(Array.isArray)).toBe(false);
  });

  it('accepts only the clean v2 project envelope', () => {
    const project = createProject('Test');
    expect(isProject(project)).toBe(true);
    expect(isProject({ version: 1, name: 'old', effects: [] })).toBe(false);
    expect(isProject({ ...project, version: 1 })).toBe(false);
    expect(isProject({ ...project, nodes: [{ ...project.nodes[0], parameters: { ...project.nodes[0].parameters, nodes: [] } }] })).toBe(false);
  });

  it('clamps imported values to manifest ranges', () => {
    const project = createProject('A name that is valid', [createEffect('pixelate')]);
    project.nodes[0].parameters.p0 = 999;
    const normalized = normalizeProject(project);
    expect(normalized.nodes[0].parameters.p0).toBe(effectDefinition('pixelate').params[0].max);
  });

  it('builds a bounded random stack without duplicate kinds', () => {
    const stack = randomEffectStack(6, () => .42);
    expect(stack).toHaveLength(6);
    expect(new Set(stack.map((effect) => effect.kind)).size).toBe(6);
    expect(randomEffectStack(99, () => .1)).toHaveLength(6);
    expect(randomEffectStack(0, () => .1)).toHaveLength(1);
  });

  it('randomizes one node within every declared parameter range', () => {
    const effect = randomizeEffect('pixelate', () => .73);
    for (const parameter of effectDefinition(effect.kind).params) {
      expect(effect.parameters[parameter.key]).toBeGreaterThanOrEqual(parameter.min);
      expect(effect.parameters[parameter.key]).toBeLessThanOrEqual(parameter.max);
    }
  });

  it('exposes bounded pixel-sort spans and motion-driven datamosh controls', () => {
    const pixelSort = effectDefinition('pixelSort');
    expect(pixelSort.params.map((parameter) => parameter.name)).toEqual(['Low threshold', 'Span limit', 'Direction', 'High threshold']);
    expect(pixelSort.params[1].max).toBe(17);
    expect(pixelSort.params[1].format?.(17)).toBe('FULL');
    expect(pixelSort.cost).toBe(3);

    const datamosh = effectDefinition('datamosh');
    expect(datamosh.params.map((parameter) => parameter.name)).toEqual(['Frame loss', 'Block size', 'Motion gain', 'Persistence']);
    expect(datamosh.usesHistory).toBe(true);
    expect(datamosh.cost).toBe(3);
  });

  it('instantiates gallery recipes as ordinary independent flat nodes', () => {
    expect(BUILTIN_RECIPES.length).toBeGreaterThanOrEqual(12);
    for (const recipe of BUILTIN_RECIPES) {
      const first = instantiateRecipe(recipe);
      const second = instantiateRecipe(recipe);
      expect(first).toHaveLength(recipe.nodes.length);
      expect(first.map((node) => node.kind)).toEqual(recipe.nodes.map((node) => node.kind));
      expect(first.every((node, index) => node.id !== second[index].id)).toBe(true);
      expect(first.every((node) => !Object.values(node).some(Array.isArray))).toBe(true);
    }
  });
});

describe('camera orientation', () => {
  it('mirrors explicit front-facing cameras on mobile', () => {
    expect(isFrontFacingCamera({ facingMode: 'user' }, 'Back Camera', 2)).toBe(true);
  });

  it('does not mirror explicit rear-facing cameras', () => {
    expect(isFrontFacingCamera({ facingMode: 'environment' }, 'Front Camera', 2)).toBe(false);
  });

  it('recognizes common desktop and phone camera labels', () => {
    expect(isFrontFacingCamera({}, 'FaceTime HD Camera', 2)).toBe(true);
    expect(isFrontFacingCamera({}, 'External Webcam', 2)).toBe(true);
    expect(isFrontFacingCamera({}, 'iPhone Back Camera', 2)).toBe(false);
  });

  it('treats a single unknown camera as a user-facing webcam', () => {
    expect(isFrontFacingCamera({}, '', 1)).toBe(true);
    expect(isFrontFacingCamera({}, '', 2)).toBe(false);
  });
});
