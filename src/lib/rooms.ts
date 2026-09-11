import type { Point, Room, Wall } from "../types";
import { angleDeg } from "./geometry";

const VERTEX_MERGE_EPSILON = 0.01; // meters; endpoints closer than this are the same point

interface VertexAdjacency {
  to: number;
  angle: number;
  wallId: string;
}

interface Edge {
  a: number;
  b: number;
  wallId: string;
}

/**
 * Split each edge at any other vertex that lies on its interior (collinear,
 * within `VERTEX_MERGE_EPSILON` of the line, and strictly between its
 * endpoints). Handles T-junctions where one wall's endpoint meets the
 * middle of another wall.
 */
function splitEdgesAtInteriorVertices(edges: Edge[], vertices: Point[]): Edge[] {
  const result: Edge[] = [];
  for (const edge of edges) {
    const a = vertices[edge.a];
    const b = vertices[edge.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;

    const interior: { index: number; t: number }[] = [];
    if (lengthSq > 0) {
      for (let i = 0; i < vertices.length; i++) {
        if (i === edge.a || i === edge.b) continue;
        const p = vertices[i];
        const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
        if (t <= 0 || t >= 1) continue;
        const projX = a.x + t * dx;
        const projY = a.y + t * dy;
        const perpDist = Math.hypot(p.x - projX, p.y - projY);
        if (perpDist <= VERTEX_MERGE_EPSILON) {
          interior.push({ index: i, t });
        }
      }
    }

    if (interior.length === 0) {
      result.push(edge);
      continue;
    }

    interior.sort((x, y) => x.t - y.t);
    let prev = edge.a;
    for (const { index } of interior) {
      result.push({ a: prev, b: index, wallId: edge.wallId });
      prev = index;
    }
    result.push({ a: prev, b: edge.b, wallId: edge.wallId });
  }
  return result;
}

/**
 * Detect closed room loops formed by the wall centerlines and compute each
 * one's area. Uses a planar straight-line graph face traversal: at each
 * vertex, edges are sorted by angle, and tracing always continues via the
 * next edge clockwise from the reverse of the edge just arrived on. Every
 * directed edge belongs to exactly one face; bounded (interior) faces are
 * distinguished from the unbounded outer face by the sign of their signed
 * (shoelace) area.
 */
export function computeRooms(walls: Wall[]): Room[] {
  if (walls.length < 3) return [];

  const vertices: Point[] = [];
  const vertexIndex = (p: Point): number => {
    for (let i = 0; i < vertices.length; i++) {
      if (Math.hypot(vertices[i].x - p.x, vertices[i].y - p.y) <= VERTEX_MERGE_EPSILON) {
        return i;
      }
    }
    vertices.push({ x: p.x, y: p.y });
    return vertices.length - 1;
  };

  let edges: { a: number; b: number; wallId: string }[] = [];
  for (const wall of walls) {
    const a = vertexIndex(wall.start);
    const b = vertexIndex(wall.end);
    if (a === b) continue; // zero-length wall
    edges.push({ a, b, wallId: wall.id });
  }
  if (edges.length < 3) return [];

  // Split edges at T-junctions: a vertex from another wall's endpoint that
  // lands in the interior of this edge (e.g. a partition wall meeting the
  // middle of an outer wall) needs to become a graph vertex on both edges,
  // otherwise the two walls won't share a traversable point.
  edges = splitEdgesAtInteriorVertices(edges, vertices);

  const adjacency: Map<number, VertexAdjacency[]> = new Map();
  const addDirected = (from: number, to: number, wallId: string) => {
    const angle = angleDeg(vertices[from], vertices[to]);
    const list = adjacency.get(from) ?? [];
    list.push({ to, angle, wallId });
    adjacency.set(from, list);
  };
  for (const e of edges) {
    addDirected(e.a, e.b, e.wallId);
    addDirected(e.b, e.a, e.wallId);
  }
  for (const list of adjacency.values()) {
    list.sort((x, y) => x.angle - y.angle);
  }

  const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

  /**
   * Next neighbor at vertex `v`, having just arrived from `u`: the edge
   * immediately preceding the reverse direction (v->u) in clockwise angular
   * order. This consistently traces the boundary of a single face as the
   * directed edge sequence turns around each vertex.
   */
  const nextStep = (u: number, v: number): number => {
    const neighbors = adjacency.get(v)!;
    const reverseAngle = norm360(angleDeg(vertices[v], vertices[u]));
    let candidate = neighbors[0];
    let candidateDiff = Infinity;
    for (const n of neighbors) {
      const diff = norm360(reverseAngle - n.angle);
      // A diff of 0 means it's the edge back to u; only valid as a choice
      // when v has no other neighbors (dangling endpoint).
      const effectiveDiff = diff === 0 ? 360 : diff;
      if (effectiveDiff < candidateDiff) {
        candidateDiff = effectiveDiff;
        candidate = n;
      }
    }
    return candidate.to;
  };

  const visited = new Set<string>();
  const key = (from: number, to: number) => `${from}->${to}`;
  const faces: number[][] = [];

  for (const e of edges) {
    for (const [start, second] of [
      [e.a, e.b],
      [e.b, e.a],
    ] as const) {
      if (visited.has(key(start, second))) continue;

      const loop = [start];
      let u = start;
      let v = second;
      let guard = 0;
      const maxSteps = edges.length * 2 + 5;
      while (guard++ < maxSteps) {
        visited.add(key(u, v));
        loop.push(v);
        const w = nextStep(u, v);
        u = v;
        v = w;
        if (u === start && v === second) break;
      }
      faces.push(loop);
    }
  }

  const rooms: Room[] = [];
  for (const rawLoop of faces) {
    // `rawLoop` starts and ends at the same vertex (the face traversal
    // closes the cycle); drop the redundant closing entry.
    const loop = rawLoop.slice(0, -1);
    const pts = loop.map((i) => vertices[i]);
    if (pts.length < 3) continue;

    let signedArea = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      signedArea += p1.x * p2.y - p2.x * p1.y;
    }
    signedArea /= 2;

    // Bounded (interior) faces trace with positive signed area under this
    // traversal rule; the unbounded outer face(s) trace negative.
    if (signedArea <= 1e-6) continue;

    const wallIds = new Set<string>();
    for (let i = 0; i < loop.length; i++) {
      const from = loop[i];
      const to = loop[(i + 1) % loop.length];
      const list = adjacency.get(from)!;
      const match = list.find((n) => n.to === to);
      if (match) wallIds.add(match.wallId);
    }

    const centroid = pts.reduce(
      (acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }),
      { x: 0, y: 0 },
    );

    rooms.push({
      id: loop.join("-"),
      polygon: pts,
      wallIds: Array.from(wallIds),
      area: signedArea,
      centroid,
    });
  }

  return rooms;
}
