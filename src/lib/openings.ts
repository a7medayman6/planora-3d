import type { Opening, OpeningType, Point, Wall } from "../types";
import { distance } from "./geometry";

export const DOOR_PRESETS = [
  { label: "80 cm", width: 0.8 },
  { label: "90 cm", width: 0.9 },
];
export const WINDOW_PRESETS = [
  { label: "100 cm", width: 1.0 },
  { label: "150 cm", width: 1.5 },
];

export const DEFAULT_DOOR_HEIGHT = 2.0;
export const DEFAULT_WINDOW_HEIGHT = 1.2;
export const DEFAULT_WINDOW_SILL = 0.9;

/** Clamp an offset-along-wall so the opening of `width` stays fully within the wall. */
export function clampOffset(offset: number, wallLength: number, width: number): number {
  const half = width / 2;
  if (wallLength <= width) return wallLength / 2;
  return Math.min(wallLength - half, Math.max(half, offset));
}

/** The largest opening width that still fits on a wall (leaving a small margin). */
export function maxWidthForWall(wallLength: number): number {
  return Math.max(0.2, wallLength - 0.02);
}

export interface OpeningGeometry {
  wallLength: number;
  wallAngle: number;
  center: Point;
  jambStart: Point; // toward wall.start
  jambEnd: Point; // toward wall.end
  /** Unit vector along the wall, from start to end. */
  dir: Point;
  /** Unit vector perpendicular to the wall (rotated +90°). */
  perp: Point;
}

export function openingGeometry(wall: Wall, opening: Opening): OpeningGeometry {
  const wallLength = distance(wall.start, wall.end);
  const dx = (wall.end.x - wall.start.x) / (wallLength || 1);
  const dy = (wall.end.y - wall.start.y) / (wallLength || 1);
  const offset = clampOffset(opening.offsetAlongWall, wallLength, opening.width);
  const center = { x: wall.start.x + dx * offset, y: wall.start.y + dy * offset };
  const half = opening.width / 2;
  return {
    wallLength,
    wallAngle: Math.atan2(dy, dx),
    center,
    jambStart: { x: center.x - dx * half, y: center.y - dy * half },
    jambEnd: { x: center.x + dx * half, y: center.y + dy * half },
    dir: { x: dx, y: dy },
    perp: { x: -dy, y: dx },
  };
}

export function defaultOpening(
  type: OpeningType,
  wallId: string,
  offsetAlongWall: number,
  width: number,
  height?: number,
): Omit<Opening, "id"> {
  if (type === "door") {
    return {
      wallId,
      offsetAlongWall,
      width,
      height: height ?? DEFAULT_DOOR_HEIGHT,
      sillHeight: 0,
      type: "door",
      swingDirection: "right",
    };
  }
  return {
    wallId,
    offsetAlongWall,
    width,
    height: height ?? DEFAULT_WINDOW_HEIGHT,
    sillHeight: DEFAULT_WINDOW_SILL,
    type: "window",
    swingDirection: "right",
  };
}
