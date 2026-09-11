import { useState } from "react";
import { Circle, Group, Layer, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { FurnitureItem, ToolMode } from "../../types";
import { furniturePreset, FURNITURE_SIZE_MAX, FURNITURE_SIZE_MIN, ROTATION_SNAP_INCREMENT } from "../../lib/furniture";
import { angleDeg, distance, pointFromAngleLength, snapAngle, snapPointToGrid } from "../../lib/geometry";
import { useEditorStore } from "../../store/useEditorStore";

interface FurnitureLayerProps {
  furniture: FurnitureItem[];
  selectedFurnitureId: string | null;
  tool: ToolMode;
  zoom: number;
  gridSize: number;
  snapEnabled: boolean;
}

interface LiveTransform {
  id: string;
  rotation?: number;
  scale?: { w: number; d: number; h: number };
}

const HANDLE_GAP = 0.35;

export function FurnitureLayer({ furniture, selectedFurnitureId, tool, zoom, gridSize, snapEnabled }: FurnitureLayerProps) {
  const select = useEditorStore((s) => s.select);
  const updateFurniture = useEditorStore((s) => s.updateFurniture);
  const [live, setLive] = useState<LiveTransform | null>(null);

  return (
    <Layer>
      {furniture.map((item) => {
        const selected = item.id === selectedFurnitureId;
        const isLive = live?.id === item.id;
        const rotation = isLive && live?.rotation != null ? live.rotation : item.rotation;
        const scale = isLive && live?.scale ? live.scale : item.scale;
        const preset = furniturePreset(item.type);

        const rotateHandlePos = pointFromAngleLength(item.position, rotation - 90, scale.d / 2 + HANDLE_GAP);
        const resizeHandlePos = pointFromAngleLength(
          item.position,
          rotation + (Math.atan2(scale.d / 2, scale.w / 2) * 180) / Math.PI,
          Math.hypot(scale.w / 2, scale.d / 2),
        );

        return (
          <Group key={item.id}>
            <Group
              x={item.position.x}
              y={item.position.y}
              rotation={rotation}
              draggable={tool === "select"}
              onClick={() => tool === "select" && select({ kind: "furniture", id: item.id })}
              onTap={() => tool === "select" && select({ kind: "furniture", id: item.id })}
              onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                let next = { x: e.target.x(), y: e.target.y() };
                if (snapEnabled) next = snapPointToGrid(next, gridSize);
                updateFurniture(item.id, { position: next });
              }}
            >
              <Rect
                x={-scale.w / 2}
                y={-scale.d / 2}
                width={scale.w}
                height={scale.d}
                fill={item.color}
                stroke={selected ? "#2f6fed" : "#33302a"}
                strokeWidth={(selected ? 2.5 : 1) / zoom}
                cornerRadius={Math.min(scale.w, scale.d) * 0.08}
              />
              <Line
                points={[0, -scale.d / 2, -scale.w * 0.15, -scale.d / 2 + scale.d * 0.12, scale.w * 0.15, -scale.d / 2 + scale.d * 0.12]}
                closed
                fill="#33302a"
                opacity={0.5}
                listening={false}
              />
              <Text
                text={preset.label}
                fontSize={11 / zoom}
                fill="#20242c"
                width={scale.w}
                height={scale.d}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>

            {selected && tool === "select" && (
              <>
                <Line
                  points={[item.position.x, item.position.y, rotateHandlePos.x, rotateHandlePos.y]}
                  stroke="#2f6fed"
                  strokeWidth={1 / zoom}
                  dash={[4 / zoom, 3 / zoom]}
                  listening={false}
                />
                <Circle
                  x={rotateHandlePos.x}
                  y={rotateHandlePos.y}
                  radius={6 / zoom}
                  fill="#ffffff"
                  stroke="#2f6fed"
                  strokeWidth={1.5 / zoom}
                  draggable
                  onDragMove={(e) => {
                    const p = { x: e.target.x(), y: e.target.y() };
                    const rawAngle = angleDeg(item.position, p) + 90;
                    const modifierFree = (e.evt as MouseEvent).shiftKey;
                    const next = modifierFree ? rawAngle : snapAngle(rawAngle, ROTATION_SNAP_INCREMENT, 180);
                    setLive({ id: item.id, rotation: ((next % 360) + 360) % 360 });
                  }}
                  onDragEnd={(e) => {
                    const p = { x: e.target.x(), y: e.target.y() };
                    const rawAngle = angleDeg(item.position, p) + 90;
                    const modifierFree = (e.evt as MouseEvent).shiftKey;
                    const next = modifierFree ? rawAngle : snapAngle(rawAngle, ROTATION_SNAP_INCREMENT, 180);
                    updateFurniture(item.id, { rotation: ((next % 360) + 360) % 360 });
                    setLive(null);
                  }}
                />
                <Circle
                  x={resizeHandlePos.x}
                  y={resizeHandlePos.y}
                  radius={6 / zoom}
                  fill="#ffffff"
                  stroke="#2f6fed"
                  strokeWidth={1.5 / zoom}
                  draggable
                  onDragMove={(e) => {
                    const p = { x: e.target.x(), y: e.target.y() };
                    const factor = distance(item.position, p) / Math.hypot(item.scale.w / 2, item.scale.d / 2);
                    const w = Math.min(FURNITURE_SIZE_MAX, Math.max(FURNITURE_SIZE_MIN, item.scale.w * factor));
                    const d = Math.min(FURNITURE_SIZE_MAX, Math.max(FURNITURE_SIZE_MIN, item.scale.d * factor));
                    setLive({ id: item.id, scale: { w, d, h: item.scale.h } });
                  }}
                  onDragEnd={(e) => {
                    const p = { x: e.target.x(), y: e.target.y() };
                    const factor = distance(item.position, p) / Math.hypot(item.scale.w / 2, item.scale.d / 2);
                    const w = Math.min(FURNITURE_SIZE_MAX, Math.max(FURNITURE_SIZE_MIN, item.scale.w * factor));
                    const d = Math.min(FURNITURE_SIZE_MAX, Math.max(FURNITURE_SIZE_MIN, item.scale.d * factor));
                    updateFurniture(item.id, { scale: { w, d, h: item.scale.h } });
                    setLive(null);
                  }}
                />
              </>
            )}
          </Group>
        );
      })}
    </Layer>
  );
}
