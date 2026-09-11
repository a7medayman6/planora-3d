import type { FurnitureItem } from "../../types";

interface FurnitureMeshProps {
  item: FurnitureItem;
  selected: boolean;
}

export function FurnitureMesh({ item, selected }: FurnitureMeshProps) {
  const { w, d, h } = item.scale;
  return (
    <group position={[item.position.x, 0, item.position.y]} rotation={[0, (-item.rotation * Math.PI) / 180, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={selected ? "#2f6fed" : item.color} />
      </mesh>
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) / 2, Math.max(w, d) / 2 + 0.03, 32]} />
          <meshBasicMaterial color="#2f6fed" />
        </mesh>
      )}
    </group>
  );
}
