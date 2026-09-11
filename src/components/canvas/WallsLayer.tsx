import { Circle, Layer, Line } from "react-konva";
import type Konva from "konva";
import type { ToolMode, Wall } from "../../types";
import { materialColors } from "../../lib/materials";
import { distance, projectOntoLine, snapPointToGrid, wallCorners } from "../../lib/geometry";
import { clampOffset, defaultOpening, maxWidthForWall } from "../../lib/openings";
import { useEditorStore } from "../../store/useEditorStore";

interface WallsLayerProps {
  walls: Wall[];
  selectedWallId: string | null;
  tool: ToolMode;
  zoom: number;
  gridSize: number;
  snapEnabled: boolean;
}

export function WallsLayer({ walls, selectedWallId, tool, zoom, gridSize, snapEnabled }: WallsLayerProps) {
  const select = useEditorStore((s) => s.select);
  const updateWall = useEditorStore((s) => s.updateWall);
  const addOpening = useEditorStore((s) => s.addOpening);
  const doorDefaults = useEditorStore((s) => s.doorDefaults);
  const windowDefaults = useEditorStore((s) => s.windowDefaults);

  const handleWallClick = (wall: Wall, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === "door" || tool === "window") {
      const stage = e.target.getStage();
      const pointer = stage?.getRelativePointerPosition();
      if (!pointer) return;
      const wallLength = distance(wall.start, wall.end);
      const { offset } = projectOntoLine(pointer, wall.start, wall.end);
      const defaults = tool === "door" ? doorDefaults : windowDefaults;
      const width = Math.min(defaults.width, maxWidthForWall(wallLength));
      const clamped = clampOffset(offset, wallLength, width);
      const id = addOpening(defaultOpening(tool, wall.id, clamped, width, defaults.height));
      select({ kind: "opening", id });
    } else if (tool === "select") {
      select({ kind: "wall", id: wall.id });
    }
  };

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
            onClick={(e) => handleWallClick(wall, e)}
            onTap={(e) => handleWallClick(wall, e as unknown as Konva.KonvaEventObject<MouseEvent>)}
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
