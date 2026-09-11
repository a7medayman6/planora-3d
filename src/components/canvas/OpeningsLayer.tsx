import { Group, Layer, Line, Rect } from "react-konva";
import type Konva from "konva";
import type { Opening, ToolMode, Wall } from "../../types";
import { openingGeometry, clampOffset } from "../../lib/openings";
import { distance, projectOntoLine } from "../../lib/geometry";
import { useEditorStore } from "../../store/useEditorStore";

const CANVAS_BG = "#fbfbfa";

interface OpeningsLayerProps {
  openings: Opening[];
  walls: Wall[];
  selectedOpeningId: string | null;
  tool: ToolMode;
  zoom: number;
  pan: { x: number; y: number };
}

export function OpeningsLayer({ openings, walls, selectedOpeningId, tool, zoom, pan }: OpeningsLayerProps) {
  const select = useEditorStore((s) => s.select);
  const updateOpening = useEditorStore((s) => s.updateOpening);

  return (
    <Layer>
      {openings.map((opening) => {
        const wall = walls.find((w) => w.id === opening.wallId);
        if (!wall) return null;
        const geo = openingGeometry(wall, opening);
        const selected = opening.id === selectedOpeningId;
        const { dir, perp, jambStart, jambEnd } = geo;
        const swingSign = opening.swingDirection === "right" ? 1 : -1;
        const hinge = jambStart;
        const closedTarget = jambEnd;
        const leafTip = { x: hinge.x + perp.x * opening.width * swingSign, y: hinge.y + perp.y * opening.width * swingSign };

        const angle0 = Math.atan2(closedTarget.y - hinge.y, closedTarget.x - hinge.x);
        const angle1 = Math.atan2(leafTip.y - hinge.y, leafTip.x - hinge.x);
        let delta = angle1 - angle0;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const arcPoints: number[] = [];
        const STEPS = 16;
        for (let i = 0; i <= STEPS; i++) {
          const a = angle0 + (delta * i) / STEPS;
          arcPoints.push(hinge.x + Math.cos(a) * opening.width, hinge.y + Math.sin(a) * opening.width);
        }

        const dragBoundFunc = function (this: Konva.Node, pos: { x: number; y: number }) {
          const world = { x: (pos.x - pan.x) / zoom, y: (pos.y - pan.y) / zoom };
          const wallLength = distance(wall.start, wall.end);
          const { offset } = projectOntoLine(world, wall.start, wall.end);
          const clamped = clampOffset(offset, wallLength, opening.width);
          const p = { x: wall.start.x + dir.x * clamped, y: wall.start.y + dir.y * clamped };
          return { x: p.x * zoom + pan.x, y: p.y * zoom + pan.y };
        };

        return (
          <Group key={opening.id}>
            <Rect
              x={jambStart.x}
              y={jambStart.y}
              width={opening.width}
              height={wall.thickness}
              offsetY={wall.thickness / 2}
              rotation={(Math.atan2(dir.y, dir.x) * 180) / Math.PI}
              fill={opening.type === "window" ? "rgba(160, 210, 225, 0.55)" : CANVAS_BG}
              stroke={selected ? "#2f6fed" : opening.type === "window" ? "#5b98a3" : "#8a8175"}
              strokeWidth={(selected ? 2 : 1) / zoom}
              draggable={tool === "select"}
              dragBoundFunc={dragBoundFunc}
              onClick={() => tool === "select" && select({ kind: "opening", id: opening.id })}
              onTap={() => tool === "select" && select({ kind: "opening", id: opening.id })}
              onDragEnd={(e) => {
                const world = { x: (e.target.x() - pan.x) / zoom, y: (e.target.y() - pan.y) / zoom };
                const wallLength = distance(wall.start, wall.end);
                const { offset } = projectOntoLine(world, wall.start, wall.end);
                updateOpening(opening.id, { offsetAlongWall: clampOffset(offset, wallLength, opening.width) });
              }}
            />
            {opening.type === "door" && (
              <>
                <Line points={[hinge.x, hinge.y, leafTip.x, leafTip.y]} stroke="#4a4e58" strokeWidth={1.2 / zoom} listening={false} />
                <Line points={arcPoints} stroke="#9aa0ab" strokeWidth={0.8 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} />
              </>
            )}
            {opening.type === "window" && (
              <Line
                points={[jambStart.x, jambStart.y, jambEnd.x, jambEnd.y]}
                stroke="#3d6b74"
                strokeWidth={1 / zoom}
                listening={false}
              />
            )}
          </Group>
        );
      })}
    </Layer>
  );
}
