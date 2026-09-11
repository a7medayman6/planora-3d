import { describe, expect, it } from "vitest";
import type { Opening, Wall } from "../types";
import { buildWallParts } from "./scene3d";

const wall: Wall = {
  id: "w1",
  start: { x: 0, y: 0 },
  end: { x: 4, y: 0 },
  thickness: 0.15,
  height: 2.4,
  material: "default",
};

function door(offset: number, width = 0.9, height = 2.0): Opening {
  return { id: "d1", wallId: "w1", offsetAlongWall: offset, width, height, sillHeight: 0, type: "door", swingDirection: "right" };
}

function windowOpening(offset: number, width = 1.2, height = 1.2, sillHeight = 0.9): Opening {
  return { id: "n1", wallId: "w1", offsetAlongWall: offset, width, height, sillHeight, type: "window", swingDirection: "right" };
}

describe("buildWallParts", () => {
  it("returns a single full-height solid for a wall with no openings", () => {
    const parts = buildWallParts(wall, []);
    expect(parts.solids).toHaveLength(1);
    expect(parts.solids[0]).toMatchObject({ uStart: 0, uEnd: 4, yMin: 0, yMax: 2.4 });
    expect(parts.glass).toHaveLength(0);
    expect(parts.doorLeaves).toHaveLength(0);
  });

  it("splits around a centered door with a header above and a leaf", () => {
    const parts = buildWallParts(wall, [door(2)]);
    // left solid, header above door, right solid = 3 solids
    expect(parts.solids).toHaveLength(3);
    const [left, header, right] = parts.solids;
    expect(left).toMatchObject({ uStart: 0, uEnd: 1.55, yMin: 0, yMax: 2.4 });
    expect(header).toMatchObject({ uStart: 1.55, uEnd: 2.45, yMin: 2.0, yMax: 2.4 });
    expect(right).toMatchObject({ uStart: 2.45, uEnd: 4, yMin: 0, yMax: 2.4 });
    expect(parts.doorLeaves).toHaveLength(1);
    expect(parts.doorLeaves[0].uEnd).toBeGreaterThan(parts.doorLeaves[0].uStart);
  });

  it("splits around a window into sill + lintel solids plus a glass pane and sill ledge", () => {
    const parts = buildWallParts(wall, [windowOpening(2)]);
    // left, below-sill, above-window, right = 4 solids
    expect(parts.solids).toHaveLength(4);
    expect(parts.glass).toHaveLength(1);
    expect(parts.glass[0]).toMatchObject({ uStart: 1.4, uEnd: 2.6, yMin: 0.9, yMax: 2.1 });
    expect(parts.sills).toHaveLength(1);
    expect(parts.sills[0].uStart).toBeLessThan(1.4);
    expect(parts.sills[0].uEnd).toBeGreaterThan(2.6);
  });

  it("handles a door flush against the wall start (no left solid)", () => {
    const parts = buildWallParts(wall, [door(0.45)]);
    expect(parts.solids).toHaveLength(2); // header + right solid only
  });

  it("handles multiple openings on the same wall without overlap", () => {
    const parts = buildWallParts(wall, [door(1), windowOpening(3)]);
    expect(parts.solids.length).toBeGreaterThan(0);
    expect(parts.doorLeaves).toHaveLength(1);
    expect(parts.glass).toHaveLength(1);
    // No solid segment should have uStart > uEnd
    for (const s of parts.solids) expect(s.uEnd).toBeGreaterThan(s.uStart - 1e-9);
  });
});
