import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const SPEED = 2.4; // meters per second
const EYE_HEIGHT = 1.65;

/** WASD movement for the walkthrough camera; PointerLockControls handles the look-around. */
export function WalkthroughMovement() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const k = keys.current;
    if (!k["KeyW"] && !k["KeyA"] && !k["KeyS"] && !k["KeyD"]) return;

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.set(forward.current.z, 0, -forward.current.x);

    const step = SPEED * delta;
    if (k["KeyW"]) camera.position.addScaledVector(forward.current, step);
    if (k["KeyS"]) camera.position.addScaledVector(forward.current, -step);
    if (k["KeyD"]) camera.position.addScaledVector(right.current, step);
    if (k["KeyA"]) camera.position.addScaledVector(right.current, -step);
    camera.position.y = EYE_HEIGHT;
  });

  return null;
}
