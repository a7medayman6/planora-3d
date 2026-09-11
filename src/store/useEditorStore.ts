import { create } from "zustand";
import type { LengthUnit, MaterialId, ToolMode, Wall } from "../types";

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

interface HistorySnapshot {
  walls: Wall[];
}

interface EditorState {
  walls: Wall[];
  selectedWallId: string | null;

  tool: ToolMode;
  unit: LengthUnit;
  showGrid: boolean;
  snapEnabled: boolean;

  defaultWallThickness: number;
  defaultWallHeight: number;

  zoom: number; // pixels per meter
  pan: { x: number; y: number };

  past: HistorySnapshot[];
  future: HistorySnapshot[];

  addWall: (wall: Omit<Wall, "id" | "thickness" | "height" | "material">) => string;
  updateWall: (id: string, patch: Partial<Omit<Wall, "id">>) => void;
  deleteWall: (id: string) => void;
  deleteSelected: () => void;
  setSelectedWallId: (id: string | null) => void;

  setTool: (tool: ToolMode) => void;
  setUnit: (unit: LengthUnit) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setDefaultWallThickness: (value: number) => void;
  setDefaultWallHeight: (value: number) => void;

  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;

  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 100;

export const useEditorStore = create<EditorState>((set, get) => {
  const snapshot = (): HistorySnapshot => ({ walls: get().walls });

  const pushHistory = () => {
    const past = [...get().past, snapshot()].slice(-HISTORY_LIMIT);
    set({ past, future: [] });
  };

  return {
    walls: [],
    selectedWallId: null,

    tool: "wall",
    unit: "m",
    showGrid: true,
    snapEnabled: true,

    defaultWallThickness: DEFAULT_WALL_THICKNESS,
    defaultWallHeight: DEFAULT_WALL_HEIGHT,

    zoom: 60,
    pan: { x: 0, y: 0 },

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
        selectedWallId: state.selectedWallId === id ? null : state.selectedWallId,
      }));
    },

    deleteSelected: () => {
      const id = get().selectedWallId;
      if (id) get().deleteWall(id);
    },

    setSelectedWallId: (id) => set({ selectedWallId: id }),

    setTool: (tool) => set({ tool, selectedWallId: tool === "wall" ? null : get().selectedWallId }),
    setUnit: (unit) => set({ unit }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
    setDefaultWallThickness: (value) => set({ defaultWallThickness: value }),
    setDefaultWallHeight: (value) => set({ defaultWallHeight: value }),

    setZoom: (zoom) => set({ zoom: Math.min(400, Math.max(10, zoom)) }),
    setPan: (pan) => set({ pan }),

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const currentSnapshot = snapshot();
      set({
        walls: previous.walls,
        past: past.slice(0, -1),
        future: [...future, currentSnapshot].slice(-HISTORY_LIMIT),
        selectedWallId: null,
      });
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;
      const next = future[future.length - 1];
      const currentSnapshot = snapshot();
      set({
        walls: next.walls,
        future: future.slice(0, -1),
        past: [...past, currentSnapshot].slice(-HISTORY_LIMIT),
        selectedWallId: null,
      });
    },
  };
});
