import { describe, expect, it } from "vitest";
import type { Wall } from "../types";
import { computeRooms } from "./rooms";

let idCounter = 0;
function wall(start: [number, number], end: [number, number]): Wall {
  idCounter += 1;
  return {
    id: `w${idCounter}`,
    start: { x: start[0], y: start[1] },
    end: { x: end[0], y: end[1] },
    thickness: 0.15,
    height: 2.4,
    material: "default",
  };
}

describe("computeRooms", () => {
  it("returns no rooms for an open (non-closed) wall chain", () => {
    const walls = [wall([0, 0], [4, 0]), wall([4, 0], [4, 3])];
    expect(computeRooms(walls)).toHaveLength(0);
  });

  it("returns no rooms for a single wall", () => {
    expect(computeRooms([wall([0, 0], [4, 0])])).toHaveLength(0);
  });

  it("detects a single closed rectangle and computes its area", () => {
    const walls = [
      wall([0, 0], [4, 0]),
      wall([4, 0], [4, 3]),
      wall([4, 3], [0, 3]),
      wall([0, 3], [0, 0]),
    ];
    const rooms = computeRooms(walls);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBeCloseTo(12, 5);
    expect(rooms[0].wallIds).toHaveLength(4);
  });

  it("detects two disjoint rectangles as two separate rooms", () => {
    const a = [wall([0, 0], [2, 0]), wall([2, 0], [2, 2]), wall([2, 2], [0, 2]), wall([0, 2], [0, 0])];
    const b = [
      wall([5, 0], [8, 0]),
      wall([8, 0], [8, 4]),
      wall([8, 4], [5, 4]),
      wall([5, 4], [5, 0]),
    ];
    const rooms = computeRooms([...a, ...b]);
    expect(rooms).toHaveLength(2);
    const areas = rooms.map((r) => Math.round(r.area * 100) / 100).sort((x, y) => x - y);
    expect(areas).toEqual([4, 12]);
  });

  it("detects two rooms sharing a partition wall", () => {
    // 6x3 rectangle split down the middle at x=3 into two 3x3 rooms.
    const walls = [
      wall([0, 0], [6, 0]),
      wall([6, 0], [6, 3]),
      wall([6, 3], [0, 3]),
      wall([0, 3], [0, 0]),
      wall([3, 0], [3, 3]),
    ];
    const rooms = computeRooms(walls);
    expect(rooms).toHaveLength(2);
    const areas = rooms.map((r) => Math.round(r.area * 100) / 100).sort((x, y) => x - y);
    expect(areas).toEqual([9, 9]);
  });

  it("merges nearly-coincident endpoints within tolerance", () => {
    const walls = [
      wall([0, 0], [4, 0]),
      wall([4, 0.002], [4, 3]),
      wall([4, 3], [0, 3]),
      wall([0.001, 3], [0, 0]),
    ];
    const rooms = computeRooms(walls);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBeCloseTo(12, 1);
  });

  it("computes the centroid inside the room polygon", () => {
    const walls = [
      wall([0, 0], [4, 0]),
      wall([4, 0], [4, 2]),
      wall([4, 2], [0, 2]),
      wall([0, 2], [0, 0]),
    ];
    const rooms = computeRooms(walls);
    expect(rooms[0].centroid.x).toBeCloseTo(2, 5);
    expect(rooms[0].centroid.y).toBeCloseTo(1, 5);
  });
});
