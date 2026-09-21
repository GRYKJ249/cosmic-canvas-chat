import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "@/components/theme/ThemeProvider";
import { paletteColors } from "@/lib/themes";

const EARTH_TEXTURE = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";

type SceneProps = { lite: boolean; primary: string; accent: string; dark: boolean };

function Earth({ lite, primary, accent, dark }: SceneProps) {
  const map = useLoader(THREE.TextureLoader, EARTH_TEXTURE);
  const earth = useRef<THREE.Mesh>(null!);
  const grid = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    earth.current.rotation.y += dt * 0.06;
    grid.current.rotation.y -= dt * 0.02;
  });
  const seg = lite ? 32 : 64;
  return (
    <group>
      <mesh ref={earth}>
        <sphereGeometry args={[2, seg, seg]} />
        <meshStandardMaterial
          map={map}
          roughness={0.9}
          metalness={0.05}
          emissive={new THREE.Color(primary)}
          emissiveIntensity={dark ? 0.08 : 0.02}
        />
      </mesh>
      <mesh ref={grid}>
        <sphereGeometry args={[2.06, lite ? 18 : 28, lite ? 18 : 28]} />
        <meshBasicMaterial color={primary} wireframe transparent opacity={dark ? 0.1 : 0.16} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.22, seg, seg]} />
        <meshBasicMaterial color={primary} transparent opacity={dark ? 0.14 : 0.1} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.6, 32, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={dark ? 0.05 : 0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function CodeFragments({ lite, primary, accent }: SceneProps) {
  const group = useRef<THREE.Group>(null!);
  const items = useMemo(() => {
    const count = lite ? 14 : 36;
    return Array.from({ length: count }, (_, i) => {
      const r = 2.9 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 1.4;
      return {
        r,
        theta,
        tilt,
        speed: 0.05 + Math.random() * 0.12,
        w: 0.12 + Math.random() * 0.35,
        h: 0.03 + Math.random() * 0.04,
        color: i % 3 === 0 ? accent : primary,
      };
    });
  }, [lite, primary, accent]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const it = items[i];
      if (!it) return;
      const a = it.theta + t * it.speed;
      child.position.set(Math.cos(a) * it.r, Math.sin(a) * it.r * Math.sin(it.tilt), Math.sin(a) * it.r * Math.cos(it.tilt));
      child.lookAt(0, 0, 0);
    });
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i}>
          <planeGeometry args={[it.w, it.h]} />
          <meshBasicMaterial color={it.color} transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ lite, primary }: SceneProps) {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const n = lite ? 500 : 2200;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 4 + Math.random() * 10;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      arr[i * 3 + 2] = r * Math.cos(ph);
    }
    return arr;
  }, [lite]);
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.01;
    ref.current.rotation.x += dt * 0.004;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={primary} size={lite ? 0.04 : 0.03} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null!);
  const { pointer } = useThree();
  useFrame(() => {
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.35, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.25, 0.04);
  });
  return <group ref={group}>{children}</group>;
}

function ScrollDolly() {
  const { camera } = useThree();
  useFrame(() => {
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const t = Math.min(y / 1200, 1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 6.5 + t * 2.5, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, t * 1.4, 0.05);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function GlobeScene({ lite }: { lite: boolean }) {
  const { palette } = useTheme();
  const c = paletteColors(palette);
  const props: SceneProps = { lite, primary: c.primary, accent: c.accent, dark: c.dark };

  return (
    <Canvas
      dpr={lite ? [1, 1.25] : [1, 2]}
      camera={{ position: [0, 0, 6.5], fov: 45 }}
      gl={{ antialias: !lite, alpha: true, powerPreference: lite ? "low-power" : "high-performance" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={c.dark ? 0.35 : 0.8} />
      <directionalLight position={[5, 3, 5]} intensity={c.dark ? 2.2 : 1.6} color={"#ffffff"} />
      <pointLight position={[-6, -2, -4]} intensity={c.dark ? 6 : 2} color={c.accent} />
      <Rig>
        <Suspense fallback={null}>
          <Earth {...props} />
        </Suspense>
        <CodeFragments {...props} />
        <Dust {...props} />
      </Rig>
      {!lite && <Stars radius={60} depth={40} count={1800} factor={3} saturation={0} fade speed={0.4} />}
      <ScrollDolly />
    </Canvas>
  );
}
