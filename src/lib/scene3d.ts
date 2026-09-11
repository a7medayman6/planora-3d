import type { Opening, Wall } from "../types";
import { distance } from "./geometry";

export interface SolidSegment {
  uStart: number;
  uEnd: number;
  yMin: number;
  yMax: number;
}

export interface GlassPane {
  uStart: number;
  uEnd: number;
  yMin: number;
  yMax: number;
}

export interface DoorLeaf {
  uStart: number;
  uEnd: number;
  yMin: number;
  yMax: number;
}

export interface Sill {
  uStart: number;
  uEnd: number;
  y: number;
}

export interface WallParts {
  solids: SolidSegment[];
  glass: GlassPane[];
  doorLeaves: DoorLeaf[];
  sills: Sill[];
}

/**
 * Split a wall's length into solid box segments plus door/window cutout
 * parts (header/sill solids, a glass pane, a door leaf, a window sill
 * ledge), all in the wall's local (u = distance along wall, y = height)
 * coordinates. Used to build the 3D wall mesh.
 */
export function buildWallParts(wall: Wall, wallOpenings: Opening[]): WallParts {
  const wallLength = distance(wall.start, wall.end);
  const sorted = [...wallOpenings].sort((a, b) => a.offsetAlongWall - b.offsetAlongWall);

  const solids: SolidSegment[] = [];
  const glass: GlassPane[] = [];
  const doorLeaves: DoorLeaf[] = [];
  const sills: Sill[] = [];

  let cursor = 0;
  const EPS = 1e-3;

  for (const opening of sorted) {
    const half = opening.width / 2;
    const uStart = Math.max(0, opening.offsetAlongWall - half);
    const uEnd = Math.min(wallLength, opening.offsetAlongWall + half);
    if (uStart > cursor + EPS) {
      solids.push({ uStart: cursor, uEnd: uStart, yMin: 0, yMax: wall.height });
    }

    if (opening.type === "door") {
      if (opening.height < wall.height - EPS) {
        solids.push({ uStart, uEnd, yMin: opening.height, yMax: wall.height });
      }
      const inset = Math.min(0.03, (uEnd - uStart) / 4);
      doorLeaves.push({ uStart: uStart + inset, uEnd: uEnd - inset, yMin: 0.02, yMax: opening.height - 0.02 });
    } else {
      if (opening.sillHeight > EPS) {
        solids.push({ uStart, uEnd, yMin: 0, yMax: opening.sillHeight });
      }
      const top = opening.sillHeight + opening.height;
      if (top < wall.height - EPS) {
        solids.push({ uStart, uEnd, yMin: top, yMax: wall.height });
      }
      glass.push({ uStart, uEnd, yMin: opening.sillHeight, yMax: top });
      sills.push({ uStart: uStart - 0.03, uEnd: uEnd + 0.03, y: opening.sillHeight });
    }

    cursor = uEnd;
  }

  if (cursor < wallLength - EPS) {
    solids.push({ uStart: cursor, uEnd: wallLength, yMin: 0, yMax: wall.height });
  }

  return { solids, glass, doorLeaves, sills };
}
