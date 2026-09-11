import { Layer, Line, Text } from "react-konva";
import type { Room } from "../../types";
import type { LengthUnit } from "../../types";
import { formatArea } from "../../lib/units";

interface RoomsLayerProps {
  rooms: Room[];
  unit: LengthUnit;
  zoom: number;
}

export function RoomsLayer({ rooms, unit, zoom }: RoomsLayerProps) {
  return (
    <Layer listening={false}>
      {rooms.map((room) => (
        <Line
          key={room.id}
          points={room.polygon.flatMap((p) => [p.x, p.y])}
          closed
          fill="rgba(47, 111, 237, 0.06)"
        />
      ))}
      {rooms.map((room) => (
        <Text
          key={`${room.id}-label`}
          x={room.centroid.x}
          y={room.centroid.y}
          text={formatArea(unit, room.area)}
          fontSize={13 / zoom}
          fill="#3b4252"
          align="center"
          verticalAlign="middle"
          offsetX={(formatArea(unit, room.area).length * 13) / zoom / 2.6}
        />
      ))}
    </Layer>
  );
}
