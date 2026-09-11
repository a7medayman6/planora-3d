import type { FurnitureType } from "../types";

export interface FurniturePreset {
  type: FurnitureType;
  label: string;
  icon: string;
  color: string;
  /** Real dimensions in meters: width (x), depth (y), height (z). */
  defaultSize: { w: number; d: number; h: number };
}

export const FURNITURE_PRESETS: FurniturePreset[] = [
  { type: "bed", label: "Bed", icon: "🛏", color: "#b58b6b", defaultSize: { w: 1.6, d: 2.0, h: 0.55 } },
  { type: "sofa", label: "Sofa", icon: "🛋", color: "#7c9aad", defaultSize: { w: 2.0, d: 0.9, h: 0.85 } },
  { type: "dining-table", label: "Dining table", icon: "▭", color: "#a3785a", defaultSize: { w: 1.6, d: 0.9, h: 0.75 } },
  { type: "chair", label: "Chair", icon: "◫", color: "#8d7860", defaultSize: { w: 0.45, d: 0.45, h: 0.9 } },
  { type: "desk", label: "Desk", icon: "▯", color: "#9c8465", defaultSize: { w: 1.2, d: 0.6, h: 0.75 } },
  { type: "wardrobe", label: "Wardrobe", icon: "▮", color: "#6b5a48", defaultSize: { w: 1.2, d: 0.6, h: 2.0 } },
  { type: "kitchen-island", label: "Kitchen island", icon: "▤", color: "#7a8a7a", defaultSize: { w: 1.5, d: 0.9, h: 0.9 } },
  { type: "tv-unit", label: "TV unit", icon: "▬", color: "#4c4c52", defaultSize: { w: 1.4, d: 0.4, h: 0.5 } },
];

export const FURNITURE_SIZE_MIN = 0.1;
export const FURNITURE_SIZE_MAX = 5;
export const ROTATION_SNAP_INCREMENT = 15;

export function furniturePreset(type: FurnitureType): FurniturePreset {
  return FURNITURE_PRESETS.find((p) => p.type === type) ?? FURNITURE_PRESETS[0];
}
