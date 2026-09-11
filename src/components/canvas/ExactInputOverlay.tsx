import { useEffect, useRef, useState } from "react";
import type { LengthUnit } from "../../types";
import { formatLength, parseAngle, parseLength } from "../../lib/units";

interface ExactInputOverlayProps {
  screenPos: { x: number; y: number };
  unit: LengthUnit;
  initialLength: number;
  initialAngle: number;
  onCommit: (lengthMeters: number, angleDeg: number) => void;
  onCancel: () => void;
}

export function ExactInputOverlay({
  screenPos,
  unit,
  initialLength,
  initialAngle,
  onCommit,
  onCancel,
}: ExactInputOverlayProps) {
  const [lengthText, setLengthText] = useState(() => formatLength(unit, initialLength, 3).replace(" m", "m"));
  const [angleText, setAngleText] = useState(() => `${Math.round(initialAngle * 10) / 10}`);
  const lengthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lengthRef.current?.focus();
    lengthRef.current?.select();
  }, []);

  const commit = () => {
    const length = parseLength(lengthText, unit);
    const angle = parseAngle(angleText);
    onCommit(length ?? initialLength, angle ?? initialAngle);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation so the canvas's window-level Tab/Enter/Escape
    // shortcuts (which reopen or cancel the draw override) don't also
    // fire for the same keypress used to interact with this panel.
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: screenPos.x + 14,
        top: screenPos.y + 14,
        background: "#1f2430",
        color: "#f4f5f7",
        borderRadius: 6,
        padding: "8px 10px",
        display: "flex",
        gap: 8,
        alignItems: "center",
        fontSize: 12,
        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
        zIndex: 20,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        Length
        <input
          ref={lengthRef}
          value={lengthText}
          onChange={(e) => setLengthText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: 72, fontSize: 13, padding: "3px 5px" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        Angle
        <input
          value={angleText}
          onChange={(e) => setAngleText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: 56, fontSize: 13, padding: "3px 5px" }}
        />
      </label>
      <span style={{ opacity: 0.6, alignSelf: "flex-end", paddingBottom: 4 }}>Enter ↵ / Esc</span>
    </div>
  );
}
