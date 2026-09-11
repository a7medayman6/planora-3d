import type { ProjectData } from "../store/useEditorStore";

const INDEX_KEY = "planora:projects";
const PROJECT_KEY_PREFIX = "planora:project:";

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

function readIndex(): ProjectSummary[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as ProjectSummary[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(index: ProjectSummary[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function listProjects(): ProjectSummary[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProject(data: ProjectData, id?: string): string {
  const projectId = id ?? `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  localStorage.setItem(PROJECT_KEY_PREFIX + projectId, JSON.stringify(data));
  const index = readIndex().filter((p) => p.id !== projectId);
  index.push({ id: projectId, name: data.name, updatedAt: Date.now() });
  writeIndex(index);
  return projectId;
}

export function loadProjectById(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(PROJECT_KEY_PREFIX + id);
    return raw ? (JSON.parse(raw) as ProjectData) : null;
  } catch {
    return null;
  }
}

export function deleteProject(id: string): void {
  localStorage.removeItem(PROJECT_KEY_PREFIX + id);
  writeIndex(readIndex().filter((p) => p.id !== id));
}
