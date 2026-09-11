import { Layer, Line } from "react-konva";
import { useMemo } from "react";

interface GridLayerProps {
  pan: { x: number; y: number };
  zoom: number;
  width: number;
  height: number;
}

/** Renders grid lines at 1m (major) and 0.5m (minor) spacing, plus the x/y axes. */
export function GridLayer({ pan, zoom, width, height }: GridLayerProps) {
  const lines = useMemo(() => {
    const minor = 0.5;
    const major = 1;

    const worldLeft = -pan.x / zoom;
    const worldTop = -pan.y / zoom;
    const worldRight = worldLeft + width / zoom;
    const worldBottom = worldTop + height / zoom;

    const verticals: { x: number; isMajor: boolean }[] = [];
    const start = Math.floor(worldLeft / minor) * minor;
    for (let x = start; x <= worldRight; x += minor) {
      const rounded = Math.round(x / minor) * minor;
      verticals.push({ x: rounded, isMajor: Math.abs(rounded / major - Math.round(rounded / major)) < 1e-6 });
    }
    const horizontals: { y: number; isMajor: boolean }[] = [];
    const startY = Math.floor(worldTop / minor) * minor;
    for (let y = startY; y <= worldBottom; y += minor) {
      const rounded = Math.round(y / minor) * minor;
      horizontals.push({ y: rounded, isMajor: Math.abs(rounded / major - Math.round(rounded / major)) < 1e-6 });
    }
    return { verticals, horizontals, worldLeft, worldRight, worldTop, worldBottom };
  }, [pan, zoom, width, height]);

  return (
    <Layer listening={false}>
      {lines.verticals.map((v) => (
        <Line
          key={`v${v.x}`}
          points={[v.x, lines.worldTop, v.x, lines.worldBottom]}
          stroke={v.isMajor ? "#c7cad1" : "#e4e6ea"}
          strokeWidth={(v.isMajor ? 1 : 0.6) / zoom}
        />
      ))}
      {lines.horizontals.map((h) => (
        <Line
          key={`h${h.y}`}
          points={[lines.worldLeft, h.y, lines.worldRight, h.y]}
          stroke={h.isMajor ? "#c7cad1" : "#e4e6ea"}
          strokeWidth={(h.isMajor ? 1 : 0.6) / zoom}
        />
      ))}
      <Line points={[lines.worldLeft, 0, lines.worldRight, 0]} stroke="#f0a3a3" strokeWidth={1.4 / zoom} />
      <Line points={[0, lines.worldTop, 0, lines.worldBottom]} stroke="#a3c7f0" strokeWidth={1.4 / zoom} />
    </Layer>
  );
}
