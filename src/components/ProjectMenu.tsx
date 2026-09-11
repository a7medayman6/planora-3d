import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { deleteProject, listProjects, loadProjectById, saveProject, type ProjectSummary } from "../lib/persistence";
import { exportPlanAsSVG, exportProjectAsJSON, exportStageAsPNG } from "../lib/export";
import type { ProjectData } from "../store/useEditorStore";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function ProjectMenu() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const activeProjectId = useEditorStore((s) => s.activeProjectId);
  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const furniture = useEditorStore((s) => s.furniture);
  const unit = useEditorStore((s) => s.unit);
  const canvasStage = useEditorStore((s) => s.canvasStage);
  const toProjectData = useEditorStore((s) => s.toProjectData);
  const loadProject = useEditorStore((s) => s.loadProject);
  const newProject = useEditorStore((s) => s.newProject);

  const refresh = () => setProjects(listProjects());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleSave = () => {
    const id = saveProject(toProjectData(), activeProjectId ?? undefined);
    useEditorStore.setState({ activeProjectId: id });
    refresh();
  };

  const handleSaveAsNew = () => {
    const id = saveProject(toProjectData());
    useEditorStore.setState({ activeProjectId: id });
    refresh();
  };

  const handleLoad = (id: string) => {
    const data = loadProjectById(id);
    if (data) loadProject(data, id);
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this saved project? This cannot be undone.")) return;
    deleteProject(id);
    refresh();
  };

  const handleNew = () => {
    if (!window.confirm("Start a new project? Unsaved changes will be lost.")) return;
    newProject();
    setOpen(false);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ProjectData;
        loadProject(data);
        setOpen(false);
      } catch {
        window.alert("That file doesn't look like a valid Planora project JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="project-menu" ref={rootRef}>
      <button className="toolbar-btn" onClick={() => setOpen((v) => !v)}>
        📁 {projectName}
      </button>
      {open && (
        <div className="project-dropdown">
          <label className="field">
            <span>Project name</span>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </label>

          <div className="project-dropdown-row">
            <button className="toolbar-btn" onClick={handleSave}>
              💾 Save
            </button>
            <button className="toolbar-btn" onClick={handleSaveAsNew}>
              Save as new
            </button>
            <button className="toolbar-btn" onClick={handleNew}>
              New
            </button>
          </div>

          {projects.length > 0 && (
            <div className="project-list">
              {projects.map((p) => (
                <div key={p.id} className={`project-list-row ${p.id === activeProjectId ? "active" : ""}`}>
                  <div className="project-list-info">
                    <div className="project-list-name">{p.name}</div>
                    <div className="project-list-date">{formatDate(p.updatedAt)}</div>
                  </div>
                  <button className="toolbar-btn" onClick={() => handleLoad(p.id)}>
                    Load
                  </button>
                  <button className="toolbar-btn danger" onClick={() => handleDelete(p.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="project-dropdown-divider" />

          <div className="project-dropdown-row">
            <button className="toolbar-btn" onClick={() => canvasStage && exportStageAsPNG(canvasStage, projectName)}>
              Export PNG
            </button>
            <button className="toolbar-btn" onClick={() => exportPlanAsSVG(walls, openings, furniture, unit, projectName)}>
              Export SVG
            </button>
            <button className="toolbar-btn" onClick={() => exportProjectAsJSON(toProjectData())}>
              Export JSON
            </button>
          </div>
          <div className="project-dropdown-row">
            <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()}>
              Import JSON…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
