import type Konva from "konva";
import type { FurnitureItem, LengthUnit, Opening, Wall } from "../types";
import type { ProjectData } from "../store/useEditorStore";
import { computeRooms } from "./rooms";
import { openingGeometry } from "./openings";
import { wallCorners } from "./geometry";
import { materialColors } from "./materials";
import { formatArea } from "./units";
import { furniturePreset } from "./furniture";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function exportProjectAsJSON(data: ProjectData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${sanitizeFilename(data.name)}.json`);
}

export function exportStageAsPNG(stage: Konva.Stage, projectName: string): void {
  const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
  downloadDataUrl(dataUrl, `${sanitizeFilename(projectName)}.png`);
}

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "planora-project";
}

const PX_PER_METER = 60;
const PADDING = 40;

/** Build a self-contained SVG string of the 2D floor plan, directly from the data model. */
export function buildPlanSVG(
  walls: Wall[],
  openings: Opening[],
  furniture: FurnitureItem[],
  unit: LengthUnit,
): string {
  const rooms = computeRooms(walls);
  const points = walls.flatMap((w) => [w.start, w.end]);
  let minX = 0;
  let minY = 0;
  let maxX = 10;
  let maxY = 10;
  if (points.length > 0) {
    minX = Math.min(...points.map((p) => p.x));
    maxX = Math.max(...points.map((p) => p.x));
    minY = Math.min(...points.map((p) => p.y));
    maxY = Math.max(...points.map((p) => p.y));
  }

  const toSvg = (p: { x: number; y: number }) => ({
    x: (p.x - minX) * PX_PER_METER + PADDING,
    y: (p.y - minY) * PX_PER_METER + PADDING,
  });

  const width = (maxX - minX) * PX_PER_METER + PADDING * 2;
  const height = (maxY - minY) * PX_PER_METER + PADDING * 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(0)}" height="${height.toFixed(0)}" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" font-family="system-ui, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#fbfbfa" />`);

  for (const room of rooms) {
    const pts = room.polygon.map((p) => toSvg(p));
    const d = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    parts.push(`<polygon points="${d}" fill="rgba(47,111,237,0.06)" />`);
    const c = toSvg(room.centroid);
    parts.push(
      `<text x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" font-size="13" fill="#3b4252" text-anchor="middle" dominant-baseline="middle">${escapeXml(formatArea(unit, room.area))}</text>`,
    );
  }

  for (const wall of walls) {
    const { fill, stroke } = materialColors(wall.material);
    const corners = wallCorners(wall.start, wall.end, wall.thickness).map((p) => toSvg(p));
    const d = corners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    parts.push(`<polygon points="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1" />`);
  }

  for (const opening of openings) {
    const wall = walls.find((w) => w.id === opening.wallId);
    if (!wall) continue;
    const geo = openingGeometry(wall, opening);
    const half = wall.thickness / 2;
    const a = toSvg({ x: geo.jambStart.x + geo.perp.x * half, y: geo.jambStart.y + geo.perp.y * half });
    const b = toSvg({ x: geo.jambEnd.x + geo.perp.x * half, y: geo.jambEnd.y + geo.perp.y * half });
    const c = toSvg({ x: geo.jambEnd.x - geo.perp.x * half, y: geo.jambEnd.y - geo.perp.y * half });
    const dd = toSvg({ x: geo.jambStart.x - geo.perp.x * half, y: geo.jambStart.y - geo.perp.y * half });
    const gapFill = opening.type === "window" ? "rgba(160,210,225,0.55)" : "#fbfbfa";
    const gapStroke = opening.type === "window" ? "#5b98a3" : "#8a8175";
    parts.push(
      `<polygon points="${[a, b, c, dd].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" fill="${gapFill}" stroke="${gapStroke}" stroke-width="1" />`,
    );
    if (opening.type === "door") {
      const swingSign = opening.swingDirection === "right" ? 1 : -1;
      const hinge = toSvg(geo.jambStart);
      const leafTip = toSvg({
        x: geo.jambStart.x + geo.perp.x * opening.width * swingSign,
        y: geo.jambStart.y + geo.perp.y * opening.width * swingSign,
      });
      const closedTarget = toSvg(geo.jambEnd);
      parts.push(`<line x1="${hinge.x}" y1="${hinge.y}" x2="${leafTip.x}" y2="${leafTip.y}" stroke="#4a4e58" stroke-width="1.2" />`);
      const r = (opening.width * PX_PER_METER).toFixed(1);
      const sweep = opening.swingDirection === "right" ? 1 : 0;
      parts.push(
        `<path d="M ${closedTarget.x.toFixed(1)} ${closedTarget.y.toFixed(1)} A ${r} ${r} 0 0 ${sweep} ${leafTip.x.toFixed(1)} ${leafTip.y.toFixed(1)}" fill="none" stroke="#9aa0ab" stroke-width="0.8" stroke-dasharray="5,4" />`,
      );
    } else {
      const s1 = toSvg(geo.jambStart);
      const s2 = toSvg(geo.jambEnd);
      parts.push(`<line x1="${s1.x}" y1="${s1.y}" x2="${s2.x}" y2="${s2.y}" stroke="#3d6b74" stroke-width="1" />`);
    }
  }

  for (const item of furniture) {
    const preset = furniturePreset(item.type);
    const center = toSvg(item.position);
    const w = item.scale.w * PX_PER_METER;
    const d = item.scale.d * PX_PER_METER;
    parts.push(
      `<g transform="translate(${center.x.toFixed(1)},${center.y.toFixed(1)}) rotate(${item.rotation.toFixed(1)})">` +
        `<rect x="${(-w / 2).toFixed(1)}" y="${(-d / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${d.toFixed(1)}" fill="${item.color}" stroke="#33302a" stroke-width="1" rx="${Math.min(w, d) * 0.08}" />` +
        `<text x="0" y="0" font-size="11" fill="#20242c" text-anchor="middle" dominant-baseline="middle">${escapeXml(preset.label)}</text>` +
        `</g>`,
    );
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportPlanAsSVG(
  walls: Wall[],
  openings: Opening[],
  furniture: FurnitureItem[],
  unit: LengthUnit,
  projectName: string,
): void {
  const svg = buildPlanSVG(walls, openings, furniture, unit);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  downloadBlob(blob, `${sanitizeFilename(projectName)}.svg`);
}
