import { Suspense, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TrainFront } from "lucide-react";
import "./LandingPage.css";

const ORBITS = [
  { color: "#d9472f", normal: [0, 0, 1], speed: 0.28, phases: [0, 2.25, 4.5] },
  { color: "#edb932", normal: [1, 0.25, 0], speed: 0.38, phases: [0.7, 3.7] },
  { color: "#168b65", normal: [0.35, 1, 0.5], speed: 0.32, phases: [0.2, 2.4, 4.6] },
  { color: "#347cb8", normal: [-0.55, 0.15, 0.8], speed: 0.44, phases: [1.4, 4.4] },
];

function RailOrbit({ color, normal, speed, phases, radius = 5.08 }) {
  const trainRefs = useRef([]);
  const angles = useRef([...phases]);

  const { u, v, lineGeometry } = useMemo(() => {
    const n = new THREE.Vector3(...normal).normalize();
    const axis = Math.abs(n.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const basisU = new THREE.Vector3().crossVectors(n, axis).normalize();
    const basisV = new THREE.Vector3().crossVectors(n, basisU).normalize();
    const points = Array.from({ length: 181 }, (_, index) => {
      const angle = (index / 180) * Math.PI * 2;
      return new THREE.Vector3()
        .copy(basisU)
        .multiplyScalar(Math.cos(angle) * radius)
        .addScaledVector(basisV, Math.sin(angle) * radius);
    });
    return {
      u: basisU,
      v: basisV,
      lineGeometry: new THREE.BufferGeometry().setFromPoints(points),
    };
  }, [normal, radius]);

  const cars = useMemo(() => {
    const count = 12;
    const halfArc = 0.29;
    const length = (halfArc * 2 * radius) / count - 0.012;
    return Array.from({ length: count }, (_, index) => {
      const delta = -halfArc + ((index + 0.5) / count) * halfArc * 2;
      return {
        x: radius * Math.sin(delta),
        y: radius * (Math.cos(delta) - 1),
        rotation: -delta,
        length,
      };
    });
  }, [radius]);

  useFrame((_, delta) => {
    angles.current.forEach((current, index) => {
      const next = current + delta * speed;
      angles.current[index] = next;
      const train = trainRefs.current[index];
      if (!train) return;

      const position = new THREE.Vector3()
        .copy(u)
        .multiplyScalar(Math.cos(next) * radius)
        .addScaledVector(v, Math.sin(next) * radius);
      const tangent = new THREE.Vector3()
        .copy(u)
        .multiplyScalar(-Math.sin(next))
        .addScaledVector(v, Math.cos(next))
        .normalize();
      const outward = position.clone().normalize();
      const side = new THREE.Vector3().crossVectors(tangent, outward).normalize();

      train.position.copy(position);
      train.setRotationFromMatrix(new THREE.Matrix4().makeBasis(tangent, outward, side));
    });
  });

  return (
    <>
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.34} />
      </line>
      {phases.map((phase, trainIndex) => (
        <group key={phase} ref={(node) => { trainRefs.current[trainIndex] = node; }}>
          {cars.map((car, carIndex) => (
            <group
              key={carIndex}
              position={[car.x, car.y, 0]}
              rotation={[0, 0, car.rotation]}
            >
              <mesh position={[0, 0.072, 0]}>
                <boxGeometry args={[car.length, 0.13, 0.12]} />
                <meshStandardMaterial color={color} metalness={0.18} roughness={0.36} />
              </mesh>
              <mesh position={[0, 0.103, 0.061]}>
                <boxGeometry args={[car.length * 0.76, 0.036, 0.005]} />
                <meshStandardMaterial
                  color={carIndex === 11 ? "#fff2bc" : "#d9f0f7"}
                  emissive={carIndex === 11 ? "#ffcf55" : "#84cbe4"}
                  emissiveIntensity={0.35}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}

function Globe() {
  const globeRef = useRef();
  const { size } = useThree();
  const loadedTexture = useLoader(THREE.TextureLoader, "/earth.jpg");
  const texture = useMemo(() => {
    const preparedTexture = loadedTexture.clone();
    preparedTexture.colorSpace = THREE.SRGBColorSpace;
    preparedTexture.needsUpdate = true;
    return preparedTexture;
  }, [loadedTexture]);
  const mobile = size.width < 700;

  useFrame((_, delta) => {
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.042;
  });

  return (
    <group
      ref={globeRef}
      position={mobile ? [0, -3.15, 0] : [0, -3.4, 0]}
      rotation={[-0.11, -0.85, 0.06]}
      scale={mobile ? 0.92 : 1.2}
    >
      <mesh>
        <sphereGeometry args={[5, 96, 96]} />
        <meshStandardMaterial map={texture} roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh>
        <sphereGeometry args={[5.05, 72, 72]} />
        <meshBasicMaterial color="#86b9d9" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      {ORBITS.map((orbit) => <RailOrbit key={orbit.color} {...orbit} />)}
    </group>
  );
}

function GlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10.5], fov: 40 }}
      dpr={[1, 1.7]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.72} />
      <directionalLight position={[5, 5, 8]} intensity={2.2} color="#ffffff" />
      <directionalLight position={[-5, -1, 2]} intensity={0.32} color="#8fbfdf" />
      <Suspense fallback={null}><Globe /></Suspense>
    </Canvas>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav" aria-label="Main navigation">
          <Link className="landing-brand" to="/" aria-label="Railway Block Planning System home">
            <span className="landing-brand-mark"><TrainFront size={20} strokeWidth={2} /></span>
            <span className="landing-brand-name">Railway Block Planning</span>
          </Link>
          <Link className="landing-nav-cta" to="/login">Open RBPS</Link>
        </nav>

        <div className="landing-hero-content">
          <h1>Maintenance blocks,<br />planned around the timetable.</h1>
          <p>Railway Block Planning System for India</p>
        </div>

        <div className="landing-capabilities" aria-label="System capabilities">
          <span>Track map</span>
          <span>Conflict checks</span>
          <span>Block scheduling</span>
          <span>Officer approval</span>
        </div>

        <div className="landing-globe-stage">
          <div className="landing-globe" aria-label="Animated half globe with long trains travelling on rail lines">
            <GlobeScene />
          </div>
          <div className="landing-globe-label" aria-hidden="true">
            <span /> India rail network
          </div>
        </div>
      </section>
    </main>
  );
}
