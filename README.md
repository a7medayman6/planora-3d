# Planora 3D

A browser-based CAD tool for drawing accurate 2D architectural floor plans, with a 3D preview to follow in a later milestone.

## Stack

- React + TypeScript + Vite
- Zustand for editor state (walls, selection, tool mode, undo/redo history)
- Konva / react-konva for the 2D drawing canvas
- Vitest for unit tests

## Status: Milestone 1 — 2D wall drawing

- Click-and-drag wall drawing on a grid-snapped canvas, with a live length/angle readout.
- Press **Tab** or **Enter** while drawing to type an exact length and angle instead of relying on the mouse
  (e.g. `3.5m` / `90`), confirmed with Enter, cancelled with Escape.
- Snapping to the grid, to existing wall endpoints, and to common angles (0°/45°/90°/...), toggleable.
- Configurable wall thickness and height, globally and per wall.
- Automatic detection of closed room loops (including T-junction partition walls) with live area calculation.
- Select/move/resize walls, edit their length/thickness/height/material, delete, undo/redo, unit toggle (m/ft),
  pan (space+drag or middle mouse) and zoom (scroll wheel).

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npx vitest run   # run the unit test suite (geometry + room detection)
```

## Project layout

```
src/
  types/           Core data model (Wall, Opening, FurnitureItem, Room, ...)
  lib/              Pure geometry/units/room-detection/materials logic (unit tested)
  store/            Zustand editor store
  components/
    canvas/         The 2D Konva canvas (grid, walls, rooms, drawing/snapping, exact-input overlay)
    Toolbar.tsx
    PropertiesPanel.tsx
```

The data model already includes `Opening` and `FurnitureItem` types for the door/window and furniture
milestones to come, so those features can be added without reshaping existing state.
