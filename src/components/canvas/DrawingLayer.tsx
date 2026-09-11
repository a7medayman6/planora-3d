import { Circle, Layer, Line, Text } from "react-konva";
import type { Point, LengthUnit } from "../../types";
import { wallCorners } from "../../lib/geometry";
import { formatLength } from "../../lib/units";

interface DrawingLayerProps {
  start: Point;
  end: Point;
  thickness: number;
  length: number;
  angle: number;
  unit: LengthUnit;
  zoom: number;
  snappedToEndpoint: boolean;
}

export function DrawingLayer({ start, end, thickness, length, angle, unit, zoom, snappedToEndpoint }: DrawingLayerProps) {
  const corners = wallCorners(start, end, thickness);
  const points = corners.flatMap((p) => [p.x, p.y]);
  const label = `${formatLength(unit, length, 2)}   ${Math.round(angle * 10) / 10}°`;

  return (
    <Layer listening={false}>
      <Line points={points} closed fill="rgba(47,111,237,0.25)" stroke="#2f6fed" strokeWidth={1.5 / zoom} />
      <Circle x={start.x} y={start.y} radius={4 / zoom} fill="#2f6fed" />
      <Circle
        x={end.x}
        y={end.y}
        radius={(snappedToEndpoint ? 8 : 4) / zoom}
        fill={snappedToEndpoint ? "rgba(47,111,237,0.15)" : "#2f6fed"}
        stroke={snappedToEndpoint ? "#2f6fed" : undefined}
        strokeWidth={snappedToEndpoint ? 1.5 / zoom : 0}
      />
      <Text
        x={end.x + 14 / zoom}
        y={end.y - 20 / zoom}
        text={label}
        fontSize={13 / zoom}
        fill="#1f2430"
        padding={2}
      />
    </Layer>
  );
}
