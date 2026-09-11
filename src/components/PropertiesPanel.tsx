import { useEffect, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { angleDeg, distance, pointFromAngleLength } from "../lib/geometry";
import { formatArea, formatLength, parseLength } from "../lib/units";
import { computeRooms } from "../lib/rooms";
import { MATERIAL_OPTIONS } from "../lib/materials";
import { DOOR_PRESETS, WINDOW_PRESETS, maxWidthForWall } from "../lib/openings";
import { FURNITURE_SIZE_MAX, FURNITURE_SIZE_MIN } from "../lib/furniture";
import type { LengthUnit, MaterialId } from "../types";

function LengthField({
  label,
  meters,
  unit,
  onCommit,
}: {
  label: string;
  meters: number;
  unit: LengthUnit;
  onCommit: (meters: number) => void;
}) {
  const [text, setText] = useState(formatLength(unit, meters, 3).replace(/\s*(m|ft.*)$/, ""));

  useEffect(() => {
    setText(formatLength(unit, meters, 3).replace(/\s*(m|ft.*)$/, ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meters, unit]);

  const commit = () => {
    const parsed = parseLength(text, unit);
    if (parsed != null && parsed > 0) onCommit(parsed);
    else setText(formatLength(unit, meters, 3).replace(/\s*(m|ft.*)$/, ""));
  };

  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <span className="field-unit">{unit}</span>
      </div>
    </label>
  );
}

function WallProperties() {
  const walls = useEditorStore((s) => s.walls);
  const selection = useEditorStore((s) => s.selection);
  const updateWall = useEditorStore((s) => s.updateWall);
  const deleteWall = useEditorStore((s) => s.deleteWall);
  const unit = useEditorStore((s) => s.unit);

  const wall = walls.find((w) => selection?.kind === "wall" && w.id === selection.id);
  if (!wall) return null;

  const length = distance(wall.start, wall.end);
  const angle = angleDeg(wall.start, wall.end);

  return (
    <div className="panel">
      <h3>Wall</h3>
      <LengthField
        label="Length"
        meters={length}
        unit={unit}
        onCommit={(newLength) => updateWall(wall.id, { end: pointFromAngleLength(wall.start, angle, newLength) })}
      />
      <LengthField
        label="Thickness"
        meters={wall.thickness}
        unit={unit}
        onCommit={(v) => updateWall(wall.id, { thickness: Math.min(0.6, Math.max(0.03, v)) })}
      />
      <LengthField
        label="Height"
        meters={wall.height}
        unit={unit}
        onCommit={(v) => updateWall(wall.id, { height: Math.min(6, Math.max(1, v)) })}
      />
      <label className="field">
        <span>Material</span>
        <select value={wall.material} onChange={(e) => updateWall(wall.id, { material: e.target.value as MaterialId })}>
          {MATERIAL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <div className="field-readout">Angle: {Math.round(angle * 10) / 10}°</div>
      <button className="danger-btn" onClick={() => deleteWall(wall.id)}>
        Delete wall
      </button>
    </div>
  );
}

function OpeningProperties() {
  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const selection = useEditorStore((s) => s.selection);
  const updateOpening = useEditorStore((s) => s.updateOpening);
  const deleteOpening = useEditorStore((s) => s.deleteOpening);
  const unit = useEditorStore((s) => s.unit);

  const opening = openings.find((o) => selection?.kind === "opening" && o.id === selection.id);
  const wall = opening ? walls.find((w) => w.id === opening.wallId) : null;
  if (!opening || !wall) return null;

  const wallLength = distance(wall.start, wall.end);
  const maxWidth = maxWidthForWall(wallLength);
  const presets = opening.type === "door" ? DOOR_PRESETS : WINDOW_PRESETS;

  return (
    <div className="panel">
      <h3>{opening.type === "door" ? "Door" : "Window"}</h3>
      <div className="preset-row">
        {presets.map((p) => (
          <button
            key={p.label}
            className={`preset-btn ${Math.abs(opening.width - p.width) < 1e-3 ? "active" : ""}`}
            onClick={() => updateOpening(opening.id, { width: Math.min(p.width, maxWidth) })}
          >
            {p.label}
          </button>
        ))}
      </div>
      <LengthField
        label="Width"
        meters={opening.width}
        unit={unit}
        onCommit={(v) => updateOpening(opening.id, { width: Math.min(maxWidth, Math.max(0.3, v)) })}
      />
      <LengthField
        label="Height"
        meters={opening.height}
        unit={unit}
        onCommit={(v) => updateOpening(opening.id, { height: Math.min(wall.height, Math.max(0.4, v)) })}
      />
      {opening.type === "window" && (
        <LengthField
          label="Sill height"
          meters={opening.sillHeight}
          unit={unit}
          onCommit={(v) => updateOpening(opening.id, { sillHeight: Math.min(wall.height - 0.2, Math.max(0, v)) })}
        />
      )}
      {opening.type === "door" && (
        <label className="field">
          <span>Swing side</span>
          <select
            value={opening.swingDirection}
            onChange={(e) => updateOpening(opening.id, { swingDirection: e.target.value as "left" | "right" })}
          >
            <option value="right">Right</option>
            <option value="left">Left</option>
          </select>
        </label>
      )}
      <button className="danger-btn" onClick={() => deleteOpening(opening.id)}>
        Delete {opening.type}
      </button>
    </div>
  );
}

function FurnitureProperties() {
  const furniture = useEditorStore((s) => s.furniture);
  const selection = useEditorStore((s) => s.selection);
  const updateFurniture = useEditorStore((s) => s.updateFurniture);
  const deleteFurniture = useEditorStore((s) => s.deleteFurniture);
  const unit = useEditorStore((s) => s.unit);

  const item = furniture.find((f) => selection?.kind === "furniture" && f.id === selection.id);
  if (!item) return null;

  const clampSize = (v: number) => Math.min(FURNITURE_SIZE_MAX, Math.max(FURNITURE_SIZE_MIN, v));

  return (
    <div className="panel">
      <h3>Furniture</h3>
      <LengthField
        label="Width"
        meters={item.scale.w}
        unit={unit}
        onCommit={(v) => updateFurniture(item.id, { scale: { ...item.scale, w: clampSize(v) } })}
      />
      <LengthField
        label="Depth"
        meters={item.scale.d}
        unit={unit}
        onCommit={(v) => updateFurniture(item.id, { scale: { ...item.scale, d: clampSize(v) } })}
      />
      <LengthField
        label="Height"
        meters={item.scale.h}
        unit={unit}
        onCommit={(v) => updateFurniture(item.id, { scale: { ...item.scale, h: clampSize(v) } })}
      />
      <label className="field">
        <span>Rotation</span>
        <div className="field-input">
          <input
            type="number"
            value={Math.round(item.rotation)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) updateFurniture(item.id, { rotation: ((v % 360) + 360) % 360 });
            }}
          />
          <span className="field-unit">°</span>
        </div>
      </label>
      <label className="field">
        <span>Color</span>
        <input
          type="color"
          value={item.color}
          onChange={(e) => updateFurniture(item.id, { color: e.target.value })}
          style={{ width: "100%", height: 28, border: "1px solid #d5d8de", borderRadius: 4 }}
        />
      </label>
      <button className="danger-btn" onClick={() => deleteFurniture(item.id)}>
        Delete furniture
      </button>
    </div>
  );
}

function DefaultsPanel() {
  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const furniture = useEditorStore((s) => s.furniture);
  const unit = useEditorStore((s) => s.unit);
  const defaultWallThickness = useEditorStore((s) => s.defaultWallThickness);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const setDefaultWallThickness = useEditorStore((s) => s.setDefaultWallThickness);
  const setDefaultWallHeight = useEditorStore((s) => s.setDefaultWallHeight);

  const rooms = computeRooms(walls);
  const totalLength = walls.reduce((sum, w) => sum + distance(w.start, w.end), 0);
  const totalArea = rooms.reduce((sum, r) => sum + r.area, 0);

  return (
    <div className="panel">
      <h3>Defaults</h3>
      <LengthField label="Wall thickness" meters={defaultWallThickness} unit={unit} onCommit={setDefaultWallThickness} />
      <LengthField label="Wall height" meters={defaultWallHeight} unit={unit} onCommit={setDefaultWallHeight} />

      <h3>Project</h3>
      <div className="field-readout">Walls: {walls.length}</div>
      <div className="field-readout">Total wall length: {formatLength(unit, totalLength)}</div>
      <div className="field-readout">Openings: {openings.length}</div>
      <div className="field-readout">Furniture: {furniture.length}</div>
      <div className="field-readout">Rooms: {rooms.length}</div>
      <div className="field-readout">Total area: {formatArea(unit, totalArea)}</div>

      <p className="panel-hint">
        Select the Wall tool and click to start drawing. Press Tab or Enter mid-draw to type an exact length and
        angle. Use the Door/Window tools and click a wall to place an opening. Click any element with the Select
        tool to edit its properties.
      </p>
    </div>
  );
}

export function PropertiesPanel() {
  const selection = useEditorStore((s) => s.selection);

  if (selection?.kind === "wall") return <WallProperties />;
  if (selection?.kind === "opening") return <OpeningProperties />;
  if (selection?.kind === "furniture") return <FurnitureProperties />;
  return <DefaultsPanel />;
}
