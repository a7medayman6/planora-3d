import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "react-konva";
import type Konva from "konva";
import {
  ANGLE_SNAP_INCREMENT,
  ANGLE_SNAP_TOLERANCE,
  DEFAULT_GRID_SIZE,
  ENDPOINT_SNAP_TOLERANCE,
  useEditorStore,
} from "../../store/useEditorStore";
import { computeRooms } from "../../lib/rooms";
import {
  angleDeg,
  distance,
  pointFromAngleLength,
  resolveDrawPoint,
  resolveStartPoint,
  snapPointToGrid,
} from "../../lib/geometry";
import type { Point } from "../../types";
import { GridLayer } from "./GridLayer";
import { WallsLayer } from "./WallsLayer";
import { OpeningsLayer } from "./OpeningsLayer";
import { FurnitureLayer } from "./FurnitureLayer";
import { RoomsLayer } from "./RoomsLayer";
import { DrawingLayer } from "./DrawingLayer";
import { ExactInputOverlay } from "./ExactInputOverlay";
import { defaultFurnitureFor } from "../../store/useEditorStore";
import type { FurnitureType } from "../../types";

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  return !!node && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable);
}

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const furniture = useEditorStore((s) => s.furniture);
  const selection = useEditorStore((s) => s.selection);
  const selectedWallId = selection?.kind === "wall" ? selection.id : null;
  const selectedOpeningId = selection?.kind === "opening" ? selection.id : null;
  const selectedFurnitureId = selection?.kind === "furniture" ? selection.id : null;
  const addFurniture = useEditorStore((s) => s.addFurniture);
  const setPendingFurnitureType = useEditorStore((s) => s.setPendingFurnitureType);
  const tool = useEditorStore((s) => s.tool);
  const unit = useEditorStore((s) => s.unit);
  const showGrid = useEditorStore((s) => s.showGrid);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const zoom = useEditorStore((s) => s.zoom);
  const pan = useEditorStore((s) => s.pan);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setPan = useEditorStore((s) => s.setPan);
  const addWall = useEditorStore((s) => s.addWall);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const select = useEditorStore((s) => s.select);
  const defaultWallThickness = useEditorStore((s) => s.defaultWallThickness);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setCanvasStage = useEditorStore((s) => s.setCanvasStage);

  const rooms = useMemo(() => computeRooms(walls), [walls]);

  useEffect(() => {
    setCanvasStage(stageRef.current);
    return () => setCanvasStage(null);
  }, [setCanvasStage]);

  // --- in-progress wall drawing state ---
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [snappedToEndpoint, setSnappedToEndpoint] = useState(false);
  const [overridePanel, setOverridePanel] = useState<{ screenPos: Point } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{ startScreen: Point; startPan: Point } | null>(null);
  const spaceHeldRef = useRef(false);

  // --- resize observer ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const resetDrawing = useCallback(() => {
    setDrawStart(null);
    setPreviewPoint(null);
    setOverridePanel(null);
    setSnappedToEndpoint(false);
  }, []);

  // Cancel in-progress drawing when the tool changes away from "wall".
  useEffect(() => {
    if (tool !== "wall") resetDrawing();
  }, [tool, resetDrawing]);

  const worldToScreen = useCallback(
    (p: Point) => ({ x: pan.x + p.x * zoom, y: pan.y + p.y * zoom }),
    [pan, zoom],
  );

  const finalizeSegment = useCallback(
    (end: Point) => {
      if (!drawStart) return;
      if (distance(drawStart, end) < 0.01) return; // ignore accidental zero-length clicks
      addWall({ start: drawStart, end });
      setDrawStart(end);
      setPreviewPoint(end);
      setOverridePanel(null);
    },
    [drawStart, addWall],
  );

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldBefore = { x: (pointer.x - pan.x) / zoom, y: (pointer.y - pan.y) / zoom };
      const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(400, Math.max(10, zoom * factor));
      setZoom(newZoom);
      setPan({ x: pointer.x - worldBefore.x * newZoom, y: pointer.y - worldBefore.y * newZoom });
    },
    [pan, zoom, setZoom, setPan],
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const isMiddle = e.evt.button === 1;
      const isPanTrigger = isMiddle || (e.evt.button === 0 && spaceHeldRef.current);
      if (isPanTrigger) {
        e.evt.preventDefault();
        setIsPanning(true);
        panStateRef.current = { startScreen: { x: e.evt.clientX, y: e.evt.clientY }, startPan: pan };
        return;
      }

      const stage = stageRef.current;
      if (!stage) return;
      const world = stage.getRelativePointerPosition();
      if (!world) return;

      if (tool === "wall") {
        if (e.evt.button !== 0) return;
        if (!drawStart) {
          const start = resolveStartPoint(world, walls, snapEnabled, DEFAULT_GRID_SIZE, ENDPOINT_SNAP_TOLERANCE);
          setDrawStart(start);
          setPreviewPoint(start);
        } else {
          const resolved = resolveDrawPoint({
            origin: drawStart,
            raw: world,
            walls,
            snapEnabled,
            gridSize: DEFAULT_GRID_SIZE,
            endpointTolerance: ENDPOINT_SNAP_TOLERANCE,
            angleIncrement: ANGLE_SNAP_INCREMENT,
            angleTolerance: ANGLE_SNAP_TOLERANCE,
          });
          finalizeSegment(resolved.point);
        }
      } else if (tool === "select") {
        // Clicking empty canvas clears selection.
        if (e.target === stage) select(null);
      }
    },
    [pan, tool, drawStart, walls, snapEnabled, finalizeSegment, select],
  );

  const handleMouseMove = useCallback(() => {
    // Panning is handled by the window-level listener below (reliable during fast drags).
    if (isPanning) return;
    if (tool !== "wall" || !drawStart || overridePanel) return;
    const stage = stageRef.current;
    if (!stage) return;
    const world = stage.getRelativePointerPosition();
    if (!world) return;
    const resolved = resolveDrawPoint({
      origin: drawStart,
      raw: world,
      walls,
      snapEnabled,
      gridSize: DEFAULT_GRID_SIZE,
      endpointTolerance: ENDPOINT_SNAP_TOLERANCE,
      angleIncrement: ANGLE_SNAP_INCREMENT,
      angleTolerance: ANGLE_SNAP_TOLERANCE,
    });
    setPreviewPoint(resolved.point);
    setSnappedToEndpoint(resolved.snappedToEndpoint);
  }, [isPanning, tool, drawStart, overridePanel, walls, snapEnabled]);

  // Window-level pan tracking (smoother than relying only on stage's onMouseMove).
  useEffect(() => {
    if (!isPanning) return;
    const onMove = (ev: MouseEvent) => {
      if (!panStateRef.current) return;
      const dx = ev.clientX - panStateRef.current.startScreen.x;
      const dy = ev.clientY - panStateRef.current.startScreen.y;
      setPan({ x: panStateRef.current.startPan.x + dx, y: panStateRef.current.startPan.y + dy });
    };
    const onUp = () => {
      setIsPanning(false);
      panStateRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning, setPan]);

  // --- keyboard shortcuts ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        spaceHeldRef.current = true;
      }

      if (tool === "wall" && drawStart && previewPoint && !overridePanel) {
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          setOverridePanel({ screenPos: worldToScreen(previewPoint) });
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          resetDrawing();
          return;
        }
      }

      if (isTypingTarget(e.target)) return;

      if ((e.key === "Delete" || e.key === "Backspace") && tool === "select") {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape" && tool === "select") {
        select(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [tool, drawStart, previewPoint, overridePanel, worldToScreen, resetDrawing, deleteSelected, undo, redo, select]);

  const liveLength = drawStart && previewPoint ? distance(drawStart, previewPoint) : 0;
  const liveAngle = drawStart && previewPoint ? angleDeg(drawStart, previewPoint) : 0;

  const cursorStyle = isPanning
    ? "grabbing"
    : spaceHeldRef.current
      ? "grab"
      : tool === "wall" || tool === "door" || tool === "window"
        ? "crosshair"
        : "default";

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("text/plain") as FurnitureType;
      setPendingFurnitureType(null);
      if (!type) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      let position = { x: (screenX - pan.x) / zoom, y: (screenY - pan.y) / zoom };
      if (snapEnabled) position = snapPointToGrid(position, DEFAULT_GRID_SIZE);
      const id = addFurniture({ ...defaultFurnitureFor(type), position, rotation: 0 });
      select({ kind: "furniture", id });
    },
    [pan, zoom, snapEnabled, addFurniture, setPendingFurnitureType, select],
  );

  return (
    <div
      ref={containerRef}
      className="canvas2d-root"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{ cursor: cursorStyle, background: "#fbfbfa" }}
      >
        {showGrid && <GridLayer pan={pan} zoom={zoom} width={size.width} height={size.height} />}
        <RoomsLayer rooms={rooms} unit={unit} zoom={zoom} />
        <WallsLayer
          walls={walls}
          selectedWallId={selectedWallId}
          tool={tool}
          zoom={zoom}
          gridSize={DEFAULT_GRID_SIZE}
          snapEnabled={snapEnabled}
        />
        <OpeningsLayer
          openings={openings}
          walls={walls}
          selectedOpeningId={selectedOpeningId}
          tool={tool}
          zoom={zoom}
          pan={pan}
        />
        <FurnitureLayer
          furniture={furniture}
          selectedFurnitureId={selectedFurnitureId}
          tool={tool}
          zoom={zoom}
          gridSize={DEFAULT_GRID_SIZE}
          snapEnabled={snapEnabled}
        />
        {drawStart && previewPoint && (
          <DrawingLayer
            start={drawStart}
            end={previewPoint}
            thickness={defaultWallThickness}
            length={liveLength}
            angle={liveAngle}
            unit={unit}
            zoom={zoom}
            snappedToEndpoint={snappedToEndpoint}
          />
        )}
      </Stage>

      {overridePanel && drawStart && (
        <ExactInputOverlay
          screenPos={overridePanel.screenPos}
          unit={unit}
          initialLength={liveLength}
          initialAngle={liveAngle}
          onCommit={(length, angle) => {
            const point = pointFromAngleLength(drawStart, angle, length);
            finalizeSegment(point);
          }}
          onCancel={() => setOverridePanel(null)}
        />
      )}
    </div>
  );
}
