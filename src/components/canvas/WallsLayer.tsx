import { Circle, Layer, Line } from "react-konva";
import type Konva from "konva";
import type { Wall } from "../../types";
import { materialColors } from "../../lib/materials";
import { snapPointToGrid, wallCorners } from "../../lib/geometry";
import { useEditorStore } from "../../store/useEditorStore";

interface WallsLayerProps {
  walls: Wall[];
  selectedWallId: string | null;
  tool: "select" | "wall" | "measure";
  zoom: number;
  gridSize: number;
  snapEnabled: boolean;
}

export function WallsLayer({ walls, selectedWallId, tool, zoom, gridSize, snapEnabled }: WallsLayerProps) {
  const setSelectedWallId = useEditorStore((s) => s.setSelectedWallId);
  const updateWall = useEditorStore((s) => s.updateWall);

  return (
    <Layer>
      {walls.map((wall) => {
        const selected = wall.id === selectedWallId;
        const { fill, stroke } = materialColors(wall.material);
        const corners = wallCorners(wall.start, wall.end, wall.thickness);
        const points = corners.flatMap((p) => [p.x, p.y]);

        return (
          <Line
            key={wall.id}
            points={points}
            closed
            fill={fill}
            stroke={selected ? "#2f6fed" : stroke}
            strokeWidth={(selected ? 2.5 : 1.2) / zoom}
            draggable={tool === "select"}
            onClick={() => tool === "select" && setSelectedWallId(wall.id)}
            onTap={() => tool === "select" && setSelectedWallId(wall.id)}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
              const node = e.target;
              const dx = node.x();
              const dy = node.y();
              node.position({ x: 0, y: 0 });
              let newStart = { x: wall.start.x + dx, y: wall.start.y + dy };
              let newEnd = { x: wall.end.x + dx, y: wall.end.y + dy };
              if (snapEnabled) {
                newStart = snapPointToGrid(newStart, gridSize);
                newEnd = snapPointToGrid(newEnd, gridSize);
              }
              updateWall(wall.id, { start: newStart, end: newEnd });
            }}
          />
        );
      })}

      {selectedWallId &&
        tool === "select" &&
        (() => {
          const wall = walls.find((w) => w.id === selectedWallId);
          if (!wall) return null;
          return (
            <>
              {(["start", "end"] as const).map((endName) => {
                const point = wall[endName];
                return (
                  <Circle
                    key={endName}
                    x={point.x}
                    y={point.y}
                    radius={6 / zoom}
                    fill="#ffffff"
                    stroke="#2f6fed"
                    strokeWidth={1.5 / zoom}
                    draggable
                    onDragMove={(e) => {
                      e.target.getStage()?.container().style.setProperty("cursor", "grabbing");
                    }}
                    onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                      let next = { x: e.target.x(), y: e.target.y() };
                      if (snapEnabled) next = snapPointToGrid(next, gridSize);
                      updateWall(wall.id, { [endName]: next } as Partial<Wall>);
                    }}
                  />
                );
              })}
            </>
          );
        })()}
    </Layer>
  );
}
