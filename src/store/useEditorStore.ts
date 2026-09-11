import { create } from "zustand";
import type Konva from "konva";
import type { FurnitureItem, FurnitureType, LengthUnit, MaterialId, Opening, OpeningType, ToolMode, Wall } from "../types";
import { FURNITURE_PRESETS } from "../lib/furniture";

let nextId = 1;
export function generateId(prefix: string): string {
  return `${prefix}-${nextId++}-${Date.now().toString(36)}`;
}

const DEFAULT_WALL_THICKNESS = 0.15; // meters
const DEFAULT_WALL_HEIGHT = 2.4; // meters
export const DEFAULT_GRID_SIZE = 0.1; // meters (10cm snap increment)
export const ENDPOINT_SNAP_TOLERANCE = 0.15; // meters, in world space (scaled by zoom on screen)
export const ANGLE_SNAP_INCREMENT = 45;
export const ANGLE_SNAP_TOLERANCE = 5;

export type Selection =
  | { kind: "wall"; id: string }
  | { kind: "opening"; id: string }
  | { kind: "furniture"; id: string }
  | null;

export type ViewMode = "2d" | "3d" | "split";
export type Render3DMode = "dollhouse" | "walkthrough";

export interface BackgroundImage {
  src: string;
  x: number;
  y: number;
  /** World meters per original image pixel. */
  scale: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

interface HistorySnapshot {
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  pinnedDimensionWallIds: string[];
}

export interface ProjectData {
  version: 1;
  name: string;
  unit: LengthUnit;
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  pinnedDimensionWallIds: string[];
  defaultWallThickness: number;
  defaultWallHeight: number;
  backgroundImage: BackgroundImage | null;
}

interface EditorState {
  projectName: string;
  activeProjectId: string | null;
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  selection: Selection;

  tool: ToolMode;
  unit: LengthUnit;
  showGrid: boolean;
  snapEnabled: boolean;

  defaultWallThickness: number;
  defaultWallHeight: number;
  doorDefaults: { width: number; height: number };
  windowDefaults: { width: number; height: number };
  pendingFurnitureType: FurnitureType | null;

  zoom: number; // pixels per meter
  pan: { x: number; y: number };

  viewMode: ViewMode;
  render3DMode: Render3DMode;

  pinnedDimensionWallIds: string[];
  backgroundImage: BackgroundImage | null;

  /** Transient (not persisted) handle to the 2D Konva stage, for PNG export. */
  canvasStage: Konva.Stage | null;
  setCanvasStage: (stage: Konva.Stage | null) => void;

  past: HistorySnapshot[];
  future: HistorySnapshot[];

  addWall: (wall: Omit<Wall, "id" | "thickness" | "height" | "material">) => string;
  updateWall: (id: string, patch: Partial<Omit<Wall, "id">>) => void;
  deleteWall: (id: string) => void;

  addOpening: (opening: Omit<Opening, "id">) => string;
  updateOpening: (id: string, patch: Partial<Omit<Opening, "id">>) => void;
  deleteOpening: (id: string) => void;

  addFurniture: (item: Omit<FurnitureItem, "id">) => string;
  updateFurniture: (id: string, patch: Partial<Omit<FurnitureItem, "id">>) => void;
  deleteFurniture: (id: string) => void;
  setPendingFurnitureType: (type: FurnitureType | null) => void;

  select: (selection: Selection) => void;
  deleteSelected: () => void;

  setTool: (tool: ToolMode) => void;
  setUnit: (unit: LengthUnit) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setDefaultWallThickness: (value: number) => void;
  setDefaultWallHeight: (value: number) => void;
  setDoorDefaults: (v: Partial<{ width: number; height: number }>) => void;
  setWindowDefaults: (v: Partial<{ width: number; height: number }>) => void;

  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setViewMode: (mode: ViewMode) => void;
  setRender3DMode: (mode: Render3DMode) => void;

  toggleDimensionPin: (wallId: string) => void;

  setBackgroundImage: (image: BackgroundImage | null) => void;
  updateBackgroundImage: (patch: Partial<BackgroundImage>) => void;

  undo: () => void;
  redo: () => void;

  setProjectName: (name: string) => void;
  loadProject: (data: ProjectData, id?: string) => void;
  newProject: () => void;
  toProjectData: () => ProjectData;
}

const HISTORY_LIMIT = 100;

export const useEditorStore = create<EditorState>((set, get) => {
  const snapshot = (): HistorySnapshot => ({
    walls: get().walls,
    openings: get().openings,
    furniture: get().furniture,
    pinnedDimensionWallIds: get().pinnedDimensionWallIds,
  });

  const pushHistory = () => {
    const past = [...get().past, snapshot()].slice(-HISTORY_LIMIT);
    set({ past, future: [] });
  };

  return {
    projectName: "Untitled Project",
    activeProjectId: null,
    walls: [],
    openings: [],
    furniture: [],
    selection: null,

    tool: "wall",
    unit: "m",
    showGrid: true,
    snapEnabled: true,

    defaultWallThickness: DEFAULT_WALL_THICKNESS,
    defaultWallHeight: DEFAULT_WALL_HEIGHT,
    doorDefaults: { width: 0.9, height: 2.0 },
    windowDefaults: { width: 1.2, height: 1.2 },
    pendingFurnitureType: null,

    zoom: 60,
    pan: { x: 0, y: 0 },

    viewMode: "2d",
    render3DMode: "dollhouse",

    pinnedDimensionWallIds: [],
    backgroundImage: null,

    canvasStage: null,
    setCanvasStage: (stage) => set({ canvasStage: stage }),

    past: [],
    future: [],

    addWall: (partial) => {
      pushHistory();
      const id = generateId("wall");
      const wall: Wall = {
        id,
        start: partial.start,
        end: partial.end,
        thickness: get().defaultWallThickness,
        height: get().defaultWallHeight,
        material: "default" as MaterialId,
      };
      set((state) => ({ walls: [...state.walls, wall] }));
      return id;
    },

    updateWall: (id, patch) => {
      pushHistory();
      set((state) => ({
        walls: state.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      }));
    },

    deleteWall: (id) => {
      pushHistory();
      set((state) => ({
        walls: state.walls.filter((w) => w.id !== id),
        openings: state.openings.filter((o) => o.wallId !== id),
        pinnedDimensionWallIds: state.pinnedDimensionWallIds.filter((w) => w !== id),
        selection: state.selection?.kind === "wall" && state.selection.id === id ? null : state.selection,
      }));
    },

    addOpening: (partial) => {
      pushHistory();
      const id = generateId(partial.type);
      set((state) => ({ openings: [...state.openings, { ...partial, id }] }));
      return id;
    },

    updateOpening: (id, patch) => {
      pushHistory();
      set((state) => ({
        openings: state.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      }));
    },

    deleteOpening: (id) => {
      pushHistory();
      set((state) => ({
        openings: state.openings.filter((o) => o.id !== id),
        selection: state.selection?.kind === "opening" && state.selection.id === id ? null : state.selection,
      }));
    },

    addFurniture: (partial) => {
      pushHistory();
      const id = generateId("furn");
      set((state) => ({ furniture: [...state.furniture, { ...partial, id }] }));
      return id;
    },

    updateFurniture: (id, patch) => {
      pushHistory();
      set((state) => ({
        furniture: state.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      }));
    },

    deleteFurniture: (id) => {
      pushHistory();
      set((state) => ({
        furniture: state.furniture.filter((f) => f.id !== id),
        selection: state.selection?.kind === "furniture" && state.selection.id === id ? null : state.selection,
      }));
    },

    setPendingFurnitureType: (type) => set({ pendingFurnitureType: type }),

    select: (selection) => set({ selection }),

    deleteSelected: () => {
      const sel = get().selection;
      if (!sel) return;
      if (sel.kind === "wall") get().deleteWall(sel.id);
      else if (sel.kind === "opening") get().deleteOpening(sel.id);
      else get().deleteFurniture(sel.id);
    },

    setTool: (tool) => set({ tool, selection: tool === "select" ? get().selection : null }),
    setUnit: (unit) => set({ unit }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
    setDefaultWallThickness: (value) => set({ defaultWallThickness: value }),
    setDefaultWallHeight: (value) => set({ defaultWallHeight: value }),
    setDoorDefaults: (v) => set((state) => ({ doorDefaults: { ...state.doorDefaults, ...v } })),
    setWindowDefaults: (v) => set((state) => ({ windowDefaults: { ...state.windowDefaults, ...v } })),

    setZoom: (zoom) => set({ zoom: Math.min(400, Math.max(10, zoom)) }),
    setPan: (pan) => set({ pan }),
    setViewMode: (viewMode) => set({ viewMode }),
    setRender3DMode: (render3DMode) => set({ render3DMode }),

    toggleDimensionPin: (wallId) =>
      set((state) => ({
        pinnedDimensionWallIds: state.pinnedDimensionWallIds.includes(wallId)
          ? state.pinnedDimensionWallIds.filter((w) => w !== wallId)
          : [...state.pinnedDimensionWallIds, wallId],
      })),

    setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
    updateBackgroundImage: (patch) =>
      set((state) => ({
        backgroundImage: state.backgroundImage ? { ...state.backgroundImage, ...patch } : state.backgroundImage,
      })),

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const currentSnapshot = snapshot();
      set({
        walls: previous.walls,
        openings: previous.openings,
        furniture: previous.furniture,
        pinnedDimensionWallIds: previous.pinnedDimensionWallIds,
        past: past.slice(0, -1),
        future: [...future, currentSnapshot].slice(-HISTORY_LIMIT),
        selection: null,
      });
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;
      const next = future[future.length - 1];
      const currentSnapshot = snapshot();
      set({
        walls: next.walls,
        openings: next.openings,
        furniture: next.furniture,
        pinnedDimensionWallIds: next.pinnedDimensionWallIds,
        future: future.slice(0, -1),
        past: [...past, currentSnapshot].slice(-HISTORY_LIMIT),
        selection: null,
      });
    },

    setProjectName: (name) => set({ projectName: name }),

    loadProject: (data, id) => {
      set({
        projectName: data.name,
        activeProjectId: id ?? null,
        unit: data.unit,
        walls: data.walls,
        openings: data.openings,
        furniture: data.furniture,
        pinnedDimensionWallIds: data.pinnedDimensionWallIds ?? [],
        defaultWallThickness: data.defaultWallThickness,
        defaultWallHeight: data.defaultWallHeight,
        backgroundImage: data.backgroundImage ?? null,
        selection: null,
        past: [],
        future: [],
      });
    },

    newProject: () => {
      set({
        projectName: "Untitled Project",
        activeProjectId: null,
        walls: [],
        openings: [],
        furniture: [],
        pinnedDimensionWallIds: [],
        backgroundImage: null,
        selection: null,
        past: [],
        future: [],
      });
    },

    toProjectData: () => {
      const s = get();
      return {
        version: 1,
        name: s.projectName,
        unit: s.unit,
        walls: s.walls,
        openings: s.openings,
        furniture: s.furniture,
        pinnedDimensionWallIds: s.pinnedDimensionWallIds,
        defaultWallThickness: s.defaultWallThickness,
        defaultWallHeight: s.defaultWallHeight,
        backgroundImage: s.backgroundImage,
      };
    },
  };
});

export function defaultFurnitureFor(type: FurnitureType): Omit<FurnitureItem, "id" | "position" | "rotation"> {
  const preset = FURNITURE_PRESETS.find((p) => p.type === type)!;
  return { type, scale: { ...preset.defaultSize }, color: preset.color };
}

export type { OpeningType };
