import { useEffect, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { angleDeg, distance, pointFromAngleLength } from "../lib/geometry";
import { formatArea, formatLength, parseLength } from "../lib/units";
import { computeRooms } from "../lib/rooms";
import { MATERIAL_OPTIONS } from "../lib/materials";
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

export function PropertiesPanel() {
  const walls = useEditorStore((s) => s.walls);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const updateWall = useEditorStore((s) => s.updateWall);
  const deleteWall = useEditorStore((s) => s.deleteWall);
  const unit = useEditorStore((s) => s.unit);
  const defaultWallThickness = useEditorStore((s) => s.defaultWallThickness);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const setDefaultWallThickness = useEditorStore((s) => s.setDefaultWallThickness);
  const setDefaultWallHeight = useEditorStore((s) => s.setDefaultWallHeight);

  const selectedWall = walls.find((w) => w.id === selectedWallId) ?? null;
  const rooms = computeRooms(walls);

  if (selectedWall) {
    const length = distance(selectedWall.start, selectedWall.end);
    const angle = angleDeg(selectedWall.start, selectedWall.end);

    return (
      <div className="panel">
        <h3>Wall</h3>
        <LengthField
          label="Length"
          meters={length}
          unit={unit}
          onCommit={(newLength) => {
            const newEnd = pointFromAngleLength(selectedWall.start, angle, newLength);
            updateWall(selectedWall.id, { end: newEnd });
          }}
        />
        <LengthField
          label="Thickness"
          meters={selectedWall.thickness}
          unit={unit}
          onCommit={(v) => updateWall(selectedWall.id, { thickness: Math.min(0.6, Math.max(0.03, v)) })}
        />
        <LengthField
          label="Height"
          meters={selectedWall.height}
          unit={unit}
          onCommit={(v) => updateWall(selectedWall.id, { height: Math.min(6, Math.max(1, v)) })}
        />
        <label className="field">
          <span>Material</span>
          <select
            value={selectedWall.material}
            onChange={(e) => updateWall(selectedWall.id, { material: e.target.value as MaterialId })}
          >
            {MATERIAL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field-readout">Angle: {Math.round(angle * 10) / 10}°</div>
        <button className="danger-btn" onClick={() => deleteWall(selectedWall.id)}>
          Delete wall
        </button>
      </div>
    );
  }

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
      <div className="field-readout">Rooms: {rooms.length}</div>
      <div className="field-readout">Total area: {formatArea(unit, totalArea)}</div>

      <p className="panel-hint">
        Select the Wall tool and click to start drawing. Press Tab or Enter mid-draw to type an exact length and
        angle. Click a wall with the Select tool to edit its properties.
      </p>
    </div>
  );
}
