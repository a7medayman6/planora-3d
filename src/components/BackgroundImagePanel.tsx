import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";

export function BackgroundImagePanel() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backgroundImage = useEditorStore((s) => s.backgroundImage);
  const setBackgroundImage = useEditorStore((s) => s.setBackgroundImage);
  const updateBackgroundImage = useEditorStore((s) => s.updateBackgroundImage);
  const setCalibrating = useEditorStore((s) => s.setCalibrating);
  const calibrating = useEditorStore((s) => s.calibrating);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // Rough starting guess (roughly a 10m-wide plan); the user calibrates precisely afterward.
        const scale = 10 / img.naturalWidth;
        setBackgroundImage({ src, x: 0, y: 0, scale, opacity: 0.5, visible: true, locked: false });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="project-menu" ref={rootRef}>
      <button className="toolbar-btn" onClick={() => setOpen((v) => !v)}>
        🖼 Background
      </button>
      {open && (
        <div className="project-dropdown">
          {!backgroundImage ? (
            <>
              <p className="panel-hint">Import a sketch or scanned plan to trace over.</p>
              <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()}>
                Import image…
              </button>
            </>
          ) : (
            <>
              <label className="field">
                <span>Opacity</span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={backgroundImage.opacity}
                  onChange={(e) => updateBackgroundImage({ opacity: parseFloat(e.target.value) })}
                />
              </label>
              <div className="project-dropdown-row">
                <button
                  className="toolbar-btn"
                  onClick={() => updateBackgroundImage({ visible: !backgroundImage.visible })}
                >
                  {backgroundImage.visible ? "Hide" : "Show"}
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => updateBackgroundImage({ locked: !backgroundImage.locked })}
                >
                  {backgroundImage.locked ? "Unlock" : "Lock"}
                </button>
              </div>
              <button
                className={`toolbar-btn ${calibrating ? "active" : ""}`}
                onClick={() => {
                  setCalibrating(true);
                  setOpen(false);
                }}
              >
                📏 Calibrate scale…
              </button>
              <div className="project-dropdown-divider" />
              <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()}>
                Replace image…
              </button>
              <button className="toolbar-btn danger" onClick={() => setBackgroundImage(null)}>
                Remove image
              </button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
