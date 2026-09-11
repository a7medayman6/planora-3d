import type { MaterialId } from "../types";

export const MATERIAL_OPTIONS: { id: MaterialId; label: string; fill: string; stroke: string }[] = [
  { id: "default", label: "Default", fill: "#d9d2c7", stroke: "#8a8175" },
  { id: "brick", label: "Brick", fill: "#c1694f", stroke: "#8a4632" },
  { id: "concrete", label: "Concrete", fill: "#a9adb0", stroke: "#6e7275" },
  { id: "drywall", label: "Drywall", fill: "#eef0ee", stroke: "#a7aba7" },
  { id: "glass", label: "Glass", fill: "#bfe3ea", stroke: "#5b98a3" },
];

export function materialColors(material: MaterialId): { fill: string; stroke: string } {
  return MATERIAL_OPTIONS.find((m) => m.id === material) ?? MATERIAL_OPTIONS[0];
}
