import { Toolbar } from "./components/Toolbar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { FurniturePanel } from "./components/FurniturePanel";
import { Canvas2D } from "./components/canvas/Canvas2D";
import { Scene3D } from "./components/scene3d/Scene3D";
import { useEditorStore } from "./store/useEditorStore";
import "./App.css";

function App() {
  const viewMode = useEditorStore((s) => s.viewMode);

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        {viewMode !== "3d" && <FurniturePanel />}
        <div className={`canvas-area view-${viewMode}`}>
          {viewMode !== "3d" && (
            <div className="view-pane">
              <Canvas2D />
            </div>
          )}
          {viewMode !== "2d" && (
            <div className="view-pane">
              <Scene3D />
            </div>
          )}
        </div>
        <aside className="sidebar">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}

export default App;
