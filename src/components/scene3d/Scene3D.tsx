import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls, PerspectiveCamera, PointerLockControls } from "@react-three/drei";
import { useEditorStore } from "../../store/useEditorStore";
import { computeRooms } from "../../lib/rooms";
import { WallMesh } from "./WallMesh";
import { RoomFloors } from "./RoomFloors";
import { FurnitureMesh } from "./FurnitureMesh";
import { WalkthroughMovement } from "./WalkthroughMovement";

function boundingCenter(points: { x: number; y: number }[]) {
  if (points.length === 0) return { center: { x: 0, y: 0 }, radius: 5 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const radius = Math.max(3, Math.hypot(maxX - minX, maxY - minY) / 2);
  return { center, radius };
}

export function Scene3D() {
  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const furniture = useEditorStore((s) => s.furniture);
  const selection = useEditorStore((s) => s.selection);
  const render3DMode = useEditorStore((s) => s.render3DMode);

  const rooms = useMemo(() => computeRooms(walls), [walls]);

  const { center, radius } = useMemo(() => {
    const points = walls.flatMap((w) => [w.start, w.end]);
    return boundingCenter(points);
  }, [walls]);

  const dollhouseCamPos: [number, number, number] = [
    center.x + radius * 1.1,
    radius * 1.2 + 2,
    center.y + radius * 1.1,
  ];

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas shadows dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <color attach="background" args={["#dbe6ef"]} />
          <ambientLight intensity={0.65} />
          <directionalLight
            position={[center.x + radius, radius * 2 + 4, center.y + radius * 0.5]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />

          {render3DMode === "dollhouse" ? (
            <>
              <PerspectiveCamera makeDefault position={dollhouseCamPos} fov={50} />
              <OrbitControls target={[center.x, 1, center.y]} maxPolarAngle={Math.PI / 2 - 0.02} />
            </>
          ) : (
            <>
              <PerspectiveCamera makeDefault position={[center.x, 1.65, center.y]} fov={70} />
              <PointerLockControls />
              <WalkthroughMovement />
            </>
          )}

          <Grid
            args={[Math.max(20, radius * 4), Math.max(20, radius * 4)]}
            cellSize={1}
            sectionSize={5}
            cellColor="#b9c2cc"
            sectionColor="#8b96a3"
            fadeDistance={Math.max(30, radius * 6)}
            position={[0, -0.01, 0]}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[Math.max(40, radius * 8), Math.max(40, radius * 8)]} />
            <meshStandardMaterial color="#eef1f4" />
          </mesh>

          <RoomFloors rooms={rooms} />

          {walls.map((wall) => (
            <WallMesh key={wall.id} wall={wall} openings={openings} selected={selection?.kind === "wall" && selection.id === wall.id} />
          ))}

          {furniture.map((item) => (
            <FurnitureMesh key={item.id} item={item} selected={selection?.kind === "furniture" && selection.id === item.id} />
          ))}
        </Suspense>
      </Canvas>
      {render3DMode === "walkthrough" && (
        <div className="walkthrough-hint">Click to look around · WASD to move · Esc to release</div>
      )}
    </div>
  );
}
