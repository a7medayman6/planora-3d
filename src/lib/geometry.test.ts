import { describe, expect, it } from "vitest";
import {
  angleDeg,
  distance,
  findNearestEndpoint,
  pointFromAngleLength,
  resolveDrawPoint,
  roundTo,
  snapAngle,
  snapPointToGrid,
} from "./geometry";
import type { Wall } from "../types";

describe("distance/angleDeg/pointFromAngleLength", () => {
  it("computes distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });

  it("computes angle for cardinal directions", () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleDeg({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(270);
  });

  it("round-trips angle+length", () => {
    const origin = { x: 1, y: 1 };
    const p = pointFromAngleLength(origin, 45, Math.SQRT2);
    expect(p.x).toBeCloseTo(2);
    expect(p.y).toBeCloseTo(2);
  });
});

describe("roundTo / snapPointToGrid", () => {
  it("rounds to nearest step", () => {
    expect(roundTo(0.34, 0.1)).toBeCloseTo(0.3);
    expect(roundTo(0.36, 0.1)).toBeCloseTo(0.4);
  });

  it("snaps a point to the grid", () => {
    const snapped = snapPointToGrid({ x: 1.24, y: 2.37 }, 0.1);
    expect(snapped.x).toBeCloseTo(1.2);
    expect(snapped.y).toBeCloseTo(2.4);
  });
});

describe("snapAngle", () => {
  it("snaps within tolerance", () => {
    expect(snapAngle(88, 45, 5)).toBe(90);
    expect(snapAngle(2, 45, 5)).toBe(0);
    expect(snapAngle(358, 45, 5)).toBe(0);
  });

  it("leaves angle unchanged outside tolerance", () => {
    expect(snapAngle(70, 45, 5)).toBe(70);
  });
});

describe("findNearestEndpoint", () => {
  const walls: Wall[] = [
    { id: "a", start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.15, height: 2.4, material: "default" },
  ];

  it("finds an endpoint within tolerance", () => {
    const match = findNearestEndpoint({ x: 4.02, y: 0.01 }, walls, 0.1);
    expect(match?.wallId).toBe("a");
    expect(match?.end).toBe("end");
  });

  it("returns null outside tolerance", () => {
    expect(findNearestEndpoint({ x: 4.5, y: 0.5 }, walls, 0.1)).toBeNull();
  });
});

describe("resolveDrawPoint", () => {
  const origin = { x: 0, y: 0 };

  it("snaps near-horizontal drags to a clean 0deg grid point", () => {
    const result = resolveDrawPoint({
      origin,
      raw: { x: 2.03, y: 0.04 },
      walls: [],
      snapEnabled: true,
      gridSize: 0.1,
      endpointTolerance: 0.1,
      angleIncrement: 45,
      angleTolerance: 5,
    });
    expect(result.angle).toBeCloseTo(0);
    expect(result.point.y).toBeCloseTo(0);
    expect(result.point.x).toBeCloseTo(2);
  });

  it("snaps to an existing wall endpoint over grid/angle snapping", () => {
    const walls: Wall[] = [
      { id: "a", start: { x: 5, y: 5 }, end: { x: 5.03, y: 5.04 }, thickness: 0.15, height: 2.4, material: "default" },
    ];
    const result = resolveDrawPoint({
      origin,
      raw: { x: 5.03, y: 5.04 },
      walls,
      snapEnabled: true,
      gridSize: 0.1,
      endpointTolerance: 0.1,
      angleIncrement: 45,
      angleTolerance: 5,
    });
    expect(result.snappedToEndpoint).toBe(true);
    expect(result.point).toEqual({ x: 5.03, y: 5.04 });
  });

  it("passes through raw point when snapping disabled", () => {
    const result = resolveDrawPoint({
      origin,
      raw: { x: 1.234, y: 0.567 },
      walls: [],
      snapEnabled: false,
      gridSize: 0.1,
      endpointTolerance: 0.1,
      angleIncrement: 45,
      angleTolerance: 5,
    });
    expect(result.point).toEqual({ x: 1.234, y: 0.567 });
  });
});
