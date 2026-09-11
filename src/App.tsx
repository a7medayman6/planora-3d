import { Toolbar } from "./components/Toolbar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Canvas2D } from "./components/canvas/Canvas2D";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <div className="canvas-area">
          <Canvas2D />
        </div>
        <aside className="sidebar">
          <PropertiesPanel />
        </aside>
      </div>
    </div>
  );
}

export default App;
