import { useMemo } from "react";
import type { Opening, Wall } from "../../types";
import { buildWallParts } from "../../lib/scene3d";
import { materialColors } from "../../lib/materials";
import { angleDeg, distance } from "../../lib/geometry";

interface WallMeshProps {
  wall: Wall;
  openings: Opening[];
  selected: boolean;
}

/**
 * A wall rendered as a group of box segments in the wall's own local frame
 * (local +X = along the wall, local Y = height, local Z = thickness),
 * positioned at wall.start and rotated so local +X aligns with the wall's
 * direction in the world XZ (ground) plane. Plan-space (x, y) maps directly
 * to world (x, z); height maps to world Y (up).
 */
export function WallMesh({ wall, openings, selected }: WallMeshProps) {
  const wallOpenings = useMemo(() => openings.filter((o) => o.wallId === wall.id), [openings, wall.id]);
  const parts = useMemo(() => buildWallParts(wall, wallOpenings), [wall, wallOpenings]);
  const { fill } = materialColors(wall.material);
  const angleRad = (-angleDeg(wall.start, wall.end) * Math.PI) / 180;
  const wallLength = distance(wall.start, wall.end);

  return (
    <group position={[wall.start.x, 0, wall.start.y]} rotation={[0, angleRad, 0]}>
      {parts.solids.map((s, i) => (
        <mesh key={`solid-${i}`} position={[(s.uStart + s.uEnd) / 2, (s.yMin + s.yMax) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[s.uEnd - s.uStart, s.yMax - s.yMin, wall.thickness]} />
          <meshStandardMaterial color={selected ? "#2f6fed" : fill} />
        </mesh>
      ))}

      {parts.doorLeaves.map((d, i) => (
        <mesh key={`leaf-${i}`} position={[(d.uStart + d.uEnd) / 2, (d.yMin + d.yMax) / 2, 0]}>
          <boxGeometry args={[d.uEnd - d.uStart, d.yMax - d.yMin, Math.max(0.04, wall.thickness * 0.3)]} />
          <meshStandardMaterial color="#8a6240" />
        </mesh>
      ))}

      {parts.glass.map((g, i) => (
        <mesh key={`glass-${i}`} position={[(g.uStart + g.uEnd) / 2, (g.yMin + g.yMax) / 2, 0]}>
          <boxGeometry args={[g.uEnd - g.uStart, g.yMax - g.yMin, Math.max(0.02, wall.thickness * 0.4)]} />
          <meshPhysicalMaterial color="#bfe3ea" transparent opacity={0.35} roughness={0.1} metalness={0} transmission={0.4} />
        </mesh>
      ))}

      {parts.sills.map((s, i) => (
        <mesh key={`sill-${i}`} position={[(s.uStart + s.uEnd) / 2, s.y - 0.02, 0]}>
          <boxGeometry args={[s.uEnd - s.uStart, 0.04, wall.thickness * 1.4]} />
          <meshStandardMaterial color="#c9c4b8" />
        </mesh>
      ))}

      {/* invisible full-extent hit target, useful once wall selection in 3D is wired up */}
      <mesh visible={false} position={[wallLength / 2, wall.height / 2, 0]}>
        <boxGeometry args={[wallLength, wall.height, wall.thickness]} />
      </mesh>
    </group>
  );
}
