import { Fragment } from "react";
import { Layer, Line, Text } from "react-konva";
import type { LengthUnit, Wall } from "../../types";
import { distance } from "../../lib/geometry";
import { formatLength } from "../../lib/units";

interface DimensionsLayerProps {
  walls: Wall[];
  pinnedWallIds: string[];
  unit: LengthUnit;
  zoom: number;
}

const OFFSET = 0.35;

export function DimensionsLayer({ walls, pinnedWallIds, unit, zoom }: DimensionsLayerProps) {
  const pinned = walls.filter((w) => pinnedWallIds.includes(w.id));
  if (pinned.length === 0) return null;

  return (
    <Layer listening={false}>
      {pinned.map((wall) => {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const len = distance(wall.start, wall.end) || 1;
        const dirX = dx / len;
        const dirY = dy / len;
        const perpX = -dirY;
        const perpY = dirX;

        const dimStart = { x: wall.start.x + perpX * OFFSET, y: wall.start.y + perpY * OFFSET };
        const dimEnd = { x: wall.end.x + perpX * OFFSET, y: wall.end.y + perpY * OFFSET };
        const tick = 6 / zoom;
        const mid = { x: (dimStart.x + dimEnd.x) / 2, y: (dimStart.y + dimEnd.y) / 2 };
        const label = formatLength(unit, len, 2);

        return (
          <Fragment key={wall.id}>
            <Line
              key={`ext1-${wall.id}`}
              points={[wall.start.x, wall.start.y, dimStart.x, dimStart.y]}
              stroke="#7a7f8a"
              strokeWidth={0.7 / zoom}
            />
            <Line
              key={`ext2-${wall.id}`}
              points={[wall.end.x, wall.end.y, dimEnd.x, dimEnd.y]}
              stroke="#7a7f8a"
              strokeWidth={0.7 / zoom}
            />
            <Line key={`dim-${wall.id}`} points={[dimStart.x, dimStart.y, dimEnd.x, dimEnd.y]} stroke="#3b4252" strokeWidth={1 / zoom} />
            <Line
              key={`tick1-${wall.id}`}
              points={[dimStart.x - perpX * tick, dimStart.y - perpY * tick, dimStart.x + perpX * tick, dimStart.y + perpY * tick]}
              stroke="#3b4252"
              strokeWidth={1 / zoom}
            />
            <Line
              key={`tick2-${wall.id}`}
              points={[dimEnd.x - perpX * tick, dimEnd.y - perpY * tick, dimEnd.x + perpX * tick, dimEnd.y + perpY * tick]}
              stroke="#3b4252"
              strokeWidth={1 / zoom}
            />
            <Text
              key={`label-${wall.id}`}
              x={mid.x + perpX * (14 / zoom) - 30 / zoom}
              y={mid.y + perpY * (14 / zoom) - 7 / zoom}
              width={60 / zoom}
              align="center"
              text={label}
              fontSize={12 / zoom}
              fill="#3b4252"
            />
          </Fragment>
        );
      })}
    </Layer>
  );
}
