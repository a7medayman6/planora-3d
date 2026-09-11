import { FURNITURE_PRESETS } from "../lib/furniture";
import { useEditorStore } from "../store/useEditorStore";

export function FurniturePanel() {
  const setPendingFurnitureType = useEditorStore((s) => s.setPendingFurnitureType);

  return (
    <aside className="furniture-panel">
      <h3>Furniture</h3>
      <p className="panel-hint">Drag an item onto the plan to place it.</p>
      <div className="furniture-grid">
        {FURNITURE_PRESETS.map((preset) => (
          <div
            key={preset.type}
            className="furniture-chip"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", preset.type);
              e.dataTransfer.effectAllowed = "copy";
              setPendingFurnitureType(preset.type);
            }}
            onDragEnd={() => setPendingFurnitureType(null)}
            title={`${preset.label} (${preset.defaultSize.w}m × ${preset.defaultSize.d}m × ${preset.defaultSize.h}m)`}
          >
            <span className="furniture-chip-icon">{preset.icon}</span>
            <span className="furniture-chip-label">{preset.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
