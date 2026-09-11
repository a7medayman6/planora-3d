import { useMemo } from "react";
import * as THREE from "three";
import type { Room } from "../../types";

interface RoomFloorsProps {
  rooms: Room[];
}

export function RoomFloors({ rooms }: RoomFloorsProps) {
  const shapes = useMemo(
    () => rooms.map((room) => new THREE.Shape(room.polygon.map((p) => new THREE.Vector2(p.x, p.y)))),
    [rooms],
  );

  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      {shapes.map((shape, i) => (
        <mesh key={rooms[i].id} receiveShadow>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial color="#e9e6dd" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
