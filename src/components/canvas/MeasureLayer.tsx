import { Layer, Line, Text } from "react-konva";
import type { LengthUnit, Point } from "../../types";
import { distance } from "../../lib/geometry";
import { formatLength } from "../../lib/units";

interface MeasureLayerProps {
  start: Point;
  end: Point;
  unit: LengthUnit;
  zoom: number;
}

export function MeasureLayer({ start, end, unit, zoom }: MeasureLayerProps) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (10 / zoom);
  const ny = (dx / len) * (10 / zoom);
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  return (
    <Layer listening={false}>
      <Line points={[start.x, start.y, end.x, end.y]} stroke="#e0640c" strokeWidth={1.5 / zoom} dash={[8 / zoom, 5 / zoom]} />
      <Line points={[start.x - nx, start.y - ny, start.x + nx, start.y + ny]} stroke="#e0640c" strokeWidth={1.5 / zoom} />
      <Line points={[end.x - nx, end.y - ny, end.x + nx, end.y + ny]} stroke="#e0640c" strokeWidth={1.5 / zoom} />
      <Text
        x={mid.x}
        y={mid.y - 16 / zoom}
        text={formatLength(unit, distance(start, end), 2)}
        fontSize={13 / zoom}
        fill="#e0640c"
        align="center"
        offsetX={30 / zoom}
        width={60 / zoom}
      />
    </Layer>
  );
}
