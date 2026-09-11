import { useEditorStore } from "../store/useEditorStore";
import { DOOR_PRESETS, WINDOW_PRESETS } from "../lib/openings";
import type { ToolMode } from "../types";

const TOOLS: { id: ToolMode; label: string; hint: string }[] = [
  { id: "select", label: "Select", hint: "V" },
  { id: "wall", label: "Wall", hint: "W" },
  { id: "door", label: "Door", hint: "D" },
  { id: "window", label: "Window", hint: "N" },
];

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const unit = useEditorStore((s) => s.unit);
  const setUnit = useEditorStore((s) => s.setUnit);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const doorDefaults = useEditorStore((s) => s.doorDefaults);
  const windowDefaults = useEditorStore((s) => s.windowDefaults);
  const setDoorDefaults = useEditorStore((s) => s.setDoorDefaults);
  const setWindowDefaults = useEditorStore((s) => s.setWindowDefaults);

  return (
    <div className="toolbar">
      <div className="toolbar-brand">Planora 3D</div>

      <div className="toolbar-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`toolbar-btn ${tool === t.id ? "active" : ""}`}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.hint})`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tool === "door" || tool === "window") && (
        <div className="toolbar-group">
          {(tool === "door" ? DOOR_PRESETS : WINDOW_PRESETS).map((p) => {
            const current = tool === "door" ? doorDefaults.width : windowDefaults.width;
            const setWidth = tool === "door" ? setDoorDefaults : setWindowDefaults;
            return (
              <button
                key={p.label}
                className={`toolbar-btn ${Math.abs(current - p.width) < 1e-3 ? "active" : ""}`}
                onClick={() => setWidth({ width: p.width })}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">
          ↺ Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={future.length === 0}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↻ Redo
        </button>
      </div>

      <div className="toolbar-group">
        <button className={`toolbar-btn ${showGrid ? "active" : ""}`} onClick={toggleGrid} title="Toggle grid">
          # Grid
        </button>
        <button className={`toolbar-btn ${snapEnabled ? "active" : ""}`} onClick={toggleSnap} title="Toggle snapping">
          ◱ Snap
        </button>
      </div>

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => setZoom(zoom / 1.2)} title="Zoom out">
          −
        </button>
        <span className="toolbar-zoom-label">{Math.round(zoom)} px/m</span>
        <button className="toolbar-btn" onClick={() => setZoom(zoom * 1.2)} title="Zoom in">
          +
        </button>
      </div>

      <div className="toolbar-group toolbar-group-right">
        <button
          className={`toolbar-btn ${unit === "m" ? "active" : ""}`}
          onClick={() => setUnit("m")}
        >
          m
        </button>
        <button
          className={`toolbar-btn ${unit === "ft" ? "active" : ""}`}
          onClick={() => setUnit("ft")}
        >
          ft
        </button>
      </div>
    </div>
  );
}
