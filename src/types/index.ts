// Core data model. All geometry is stored in real-world meters, world space
// (x right, y "down" the plan, matching screen convention for the 2D canvas).

export interface Point {
  x: number;
  y: number;
}

export type MaterialId = "default" | "brick" | "concrete" | "drywall" | "glass";

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  /** Wall thickness in meters. */
  thickness: number;
  /** Wall height in meters. */
  height: number;
  material: MaterialId;
}

export type OpeningType = "door" | "window";
export type SwingDirection = "left" | "right";

export interface Opening {
  id: string;
  wallId: string;
  /** Distance in meters from the wall's start point to the opening's center. */
  offsetAlongWall: number;
  width: number;
  height: number;
  /** Height of the sill above the floor, in meters. 0 for doors. */
  sillHeight: number;
  type: OpeningType;
  swingDirection: SwingDirection;
}

export type FurnitureType =
  | "bed"
  | "sofa"
  | "dining-table"
  | "chair"
  | "desk"
  | "wardrobe"
  | "kitchen-island"
  | "tv-unit";

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  position: Point;
  /** Rotation in degrees, clockwise, 0 = facing "up" (north). */
  rotation: number;
  /** Real dimensions in meters. */
  scale: { w: number; d: number; h: number };
  color: string;
}

export interface Room {
  id: string;
  /** Ordered polygon vertices (wall centerline loop) tracing the room boundary. */
  polygon: Point[];
  /** Wall ids that participate in this room's boundary. */
  wallIds: string[];
  /** Area in square meters. */
  area: number;
  /** Centroid, used to position the area label. */
  centroid: Point;
}

export type LengthUnit = "m" | "ft";

export type ToolMode = "select" | "wall" | "door" | "window" | "measure" | "furniture";
