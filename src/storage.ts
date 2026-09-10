import { createProject, isProject, normalizeProject } from './effects';
import type { GalleryRecipe, ProjectV2 } from './types';

const CURRENT_KEY = 'synapsis.current.v2';
const PROJECTS_KEY = 'synapsis.projects.v2';
const LOOKS_KEY = 'synapsis.looks.v2';
export const RANDOM_COUNT_KEY = 'synapsis.random-count.v2';

export function cloneProject(project: ProjectV2): ProjectV2 {
  return structuredClone(project);
}

export function loadProject(): ProjectV2 {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CURRENT_KEY) ?? 'null');
    return isProject(parsed) ? normalizeProject(parsed) : createProject();
  } catch {
    return createProject();
  }
}

export function saveProject(project: ProjectV2): void {
  project.updatedAt = new Date().toISOString();
  localStorage.setItem(CURRENT_KEY, JSON.stringify(project));
}

export function loadProjects(): ProjectV2[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isProject).map(normalizeProject) : [];
  } catch {
    return [];
  }
}

export function saveProjectCopy(project: ProjectV2): ProjectV2[] {
  const projects = loadProjects();
  const copy = cloneProject(project);
  copy.id = crypto.randomUUID();
  copy.updatedAt = new Date().toISOString();
  const trimmed = [copy, ...projects].slice(0, 30);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function deleteProject(index: number): ProjectV2[] {
  const projects = loadProjects();
  projects.splice(index, 1);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return projects;
}

const isRecipe = (value: unknown): value is GalleryRecipe => {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as Partial<GalleryRecipe>;
  return typeof recipe.id === 'string' && typeof recipe.title === 'string' && typeof recipe.creator === 'string' && typeof recipe.description === 'string' && Array.isArray(recipe.nodes);
};

export function loadLooks(): GalleryRecipe[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LOOKS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isRecipe) : [];
  } catch {
    return [];
  }
}

export function saveLook(project: ProjectV2, title: string): GalleryRecipe[] {
  const looks = loadLooks();
  const look: GalleryRecipe = {
    id: crypto.randomUUID(),
    title: title.slice(0, 60),
    creator: 'Local',
    description: `${project.nodes.length} editable nodes`,
    nodes: project.nodes.map((node) => ({ kind: node.kind, parameters: structuredClone(node.parameters) })),
  };
  const trimmed = [look, ...looks].slice(0, 50);
  localStorage.setItem(LOOKS_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function deleteLook(index: number): GalleryRecipe[] {
  const looks = loadLooks();
  looks.splice(index, 1);
  localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  return looks;
}
