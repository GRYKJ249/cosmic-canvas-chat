import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { paletteColors } from "@/lib/themes";
import { useTheme } from "@/components/theme/ThemeProvider";

type MarkProps = { primary: string; accent: string; reducedMotion: boolean };

function DimensionalMark({ primary, accent, reducedMotion }: MarkProps) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    if (!group.current) return;
    const targetX = reducedMotion ? -0.12 : -0.12 - pointer.y * 0.24;
    const targetY = reducedMotion ? 0.4 : state.clock.elapsedTime * 0.28 + pointer.x * 0.42;
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 4, dt);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 4, dt);
    if (core.current && !reducedMotion) core.current.rotation.z += dt * 0.35;
  });

  return (
    <group ref={group} rotation={[-0.12, 0.4, 0]}>
      <mesh castShadow scale={[1, 1.18, 0.72]}>
        <torusGeometry args={[1.52, 0.32, 32, 128]} />
        <meshPhysicalMaterial color={primary} metalness={0.76} roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh castShadow rotation={[0.92, 0.12, 0.58]} scale={[0.68, 0.85, 0.68]}>
        <torusGeometry args={[1.25, 0.16, 24, 96]} />
        <meshPhysicalMaterial color={accent} metalness={0.62} roughness={0.2} clearcoat={1} />
      </mesh>
      <mesh ref={core} castShadow scale={[0.62, 0.62, 0.34]}>
        <icosahedronGeometry args={[0.82, 5]} />
        <meshPhysicalMaterial color={accent} emissive={accent} emissiveIntensity={0.16} metalness={0.82} roughness={0.12} clearcoat={1} />
      </mesh>
      {[0, Math.PI].map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * 1.5, Math.sin(angle) * 1.75, 0.25]}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function OperaLogoScene() {
  const { palette } = useTheme();
  const colors = paletteColors(palette);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 5.8], fov: 42 }} shadows gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 5, 6]} intensity={3.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, -2, 3]} intensity={5} color={colors.accent} />
      <DimensionalMark primary={colors.primary} accent={colors.accent} reducedMotion={reducedMotion} />
      <Environment>
        <Lightformer intensity={2.5} position={[0, 5, 2]} scale={[8, 8, 1]} />
        <Lightformer intensity={1.4} color={colors.accent} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[12, 2, 1]} />
      </Environment>
    </Canvas>
  );
}