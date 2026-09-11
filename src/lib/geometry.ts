import type { Point, Wall } from "../types";

/** The four corners of a wall's rectangular footprint, in order (for a closed polygon). */
export function wallCorners(start: Point, end: Point, thickness: number): [Point, Point, Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const half = thickness / 2;
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;
  return [
    { x: start.x + nx, y: start.y + ny },
    { x: end.x + nx, y: end.y + ny },
    { x: end.x - nx, y: end.y - ny },
    { x: start.x - nx, y: start.y - ny },
  ];
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Angle in degrees from `a` to `b`, in [0, 360). 0 = +x (east), increases clockwise (screen y-down). */
export function angleDeg(a: Point, b: Point): number {
  const rad = Math.atan2(b.y - a.y, b.x - a.x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function pointFromAngleLength(origin: Point, angle: number, length: number): Point {
  const rad = (angle * Math.PI) / 180;
  return {
    x: origin.x + Math.cos(rad) * length,
    y: origin.y + Math.sin(rad) * length,
  };
}

/** Round a value to the nearest multiple of `step`. */
export function roundTo(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function snapPointToGrid(point: Point, gridSize: number): Point {
  return { x: roundTo(point.x, gridSize), y: roundTo(point.y, gridSize) };
}

/**
 * Snap an angle to the nearest multiple of `increment` degrees if it falls
 * within `tolerance` degrees of it; otherwise return the angle unchanged.
 */
export function snapAngle(angle: number, increment: number, tolerance: number): number {
  const nearest = Math.round(angle / increment) * increment;
  const diff = Math.abs(((angle - nearest + 540) % 360) - 180);
  return diff <= tolerance ? ((nearest % 360) + 360) % 360 : angle;
}

export interface EndpointMatch {
  point: Point;
  wallId: string;
  end: "start" | "end";
}

/** Find the nearest wall endpoint to `point` within `tolerance` world units. */
export function findNearestEndpoint(
  point: Point,
  walls: Wall[],
  tolerance: number,
  excludeWallId?: string,
): EndpointMatch | null {
  let best: EndpointMatch | null = null;
  let bestDist = tolerance;
  for (const wall of walls) {
    if (wall.id === excludeWallId) continue;
    for (const [end, p] of [
      ["start", wall.start],
      ["end", wall.end],
    ] as const) {
      const d = distance(point, p);
      if (d <= bestDist) {
        bestDist = d;
        best = { point: p, wallId: wall.id, end };
      }
    }
  }
  return best;
}

/** Resolve a freshly clicked start point: snap to a nearby wall endpoint, else to the grid. */
export function resolveStartPoint(
  raw: Point,
  walls: Wall[],
  snapEnabled: boolean,
  gridSize: number,
  endpointTolerance: number,
): Point {
  if (!snapEnabled) return raw;
  const match = findNearestEndpoint(raw, walls, endpointTolerance);
  if (match) return match.point;
  return snapPointToGrid(raw, gridSize);
}

/**
 * Resolve the endpoint of an in-progress wall segment given a raw pointer
 * position, applying (in priority order) endpoint snap, angle snap, and
 * grid snap. Returns the resolved point plus the resulting length/angle.
 */
export function resolveDrawPoint(opts: {
  origin: Point;
  raw: Point;
  walls: Wall[];
  snapEnabled: boolean;
  gridSize: number;
  endpointTolerance: number;
  angleIncrement: number;
  angleTolerance: number;
}): { point: Point; length: number; angle: number; snappedToEndpoint: boolean } {
  const { origin, raw, walls, snapEnabled, gridSize, endpointTolerance, angleIncrement, angleTolerance } = opts;

  if (!snapEnabled) {
    return {
      point: raw,
      length: distance(origin, raw),
      angle: angleDeg(origin, raw),
    snappedToEndpoint: false,
    };
  }

  // Highest priority: snap to another wall's endpoint.
  const endpointMatch = findNearestEndpoint(raw, walls, endpointTolerance);
  if (endpointMatch) {
    return {
      point: endpointMatch.point,
      length: distance(origin, endpointMatch.point),
      angle: angleDeg(origin, endpointMatch.point),
      snappedToEndpoint: true,
    };
  }

  // Next: snap the direction to a common angle, keeping the raw distance.
  const rawAngle = angleDeg(origin, raw);
  const rawLength = distance(origin, raw);
  const snappedAngle = snapAngle(rawAngle, angleIncrement, angleTolerance);
  let point = pointFromAngleLength(origin, snappedAngle, rawLength);

  // Finally: snap the resulting point to the grid.
  point = snapPointToGrid(point, gridSize);

  return {
    point,
    length: distance(origin, point),
    angle: angleDeg(origin, point),
    snappedToEndpoint: false,
  };
}
