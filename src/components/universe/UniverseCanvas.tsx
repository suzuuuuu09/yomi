"use client";

import { Billboard, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  BIRTH_EFFECT_COUNT,
  BIRTH_EFFECT_DURATION,
  DUST_CLOUDS,
} from "@/consts/universe";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getGlowTex } from "@/lib/universe-texture";
import type { Book } from "@/types/library";
import { bookSeed, clampProgress, starVisuals } from "@/utils/universe-helper";
import BookLabels from "./BookLabels";
import { CameraSetup } from "./CameraSetup";
import { DustCloud } from "./DustCloud";
import NebulaField from "./NebulaField";
import NebulaFilaments from "./NebulaFilaments";
import StarSpikes from "./StarSpikes";

const PROGRESS_FLASH_DURATION = 0.8;
const BOOK_STAR_SCALE = 0.58;

function GlowSprite({
  color,
  scale,
  opacity,
}: {
  color: string;
  scale: number;
  opacity: number;
}) {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: getGlowTex(),
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color, opacity],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return <sprite material={mat} scale={[scale, scale, 1]} />;
}

function BookStar({
  book,
  onClick,
  isSelected,
  reducedMotion,
  onHover,
}: {
  book: Book;
  onClick: (book: Book) => void;
  isSelected: boolean;
  reducedMotion: boolean;
  onHover: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Sprite>(null);

  const isReading = book.status === "reading";
  const starColor = book.status === "completed" ? "#c4b5fd" : "#9bb5ff";

  // 読書進捗率: 未読=0.0, 読了=1.0
  const progress = clampProgress(
    book.status === "completed"
      ? 1.0
      : book.totalPages > 0
        ? book.currentPage / book.totalPages
        : 0,
  );

  const flashRef = useRef<THREE.Sprite>(null);
  const flashElapsedRef = useRef(PROGRESS_FLASH_DURATION);
  const prevProgressRef = useRef(progress);

  const {
    coreScale,
    coreOpacity,
    spikeSize,
    glowInner,
    glowMid,
    glowOuter,
    glowOpacity,
    spikeOpacity,
  } = starVisuals(progress);

  const ringRadius = Math.max(spikeSize * 0.65, 0.2);

  const coreMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: getGlowTex(),
        color: "#ffffff",
        transparent: true,
        opacity: coreOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [coreOpacity],
  );

  const flashMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: getGlowTex(),
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  const hitMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  const hitGeo = useMemo(() => new THREE.SphereGeometry(0.6, 8, 8), []);

  const seed = useMemo(() => bookSeed(book.id), [book.id]);

  useFrame((state, delta) => {
    const prevProgress = prevProgressRef.current;
    if (progress > prevProgress && !reducedMotion) {
      flashElapsedRef.current = 0;
      if (flashRef.current) flashRef.current.visible = true;
    } else if (progress < prevProgress) {
      flashElapsedRef.current = PROGRESS_FLASH_DURATION;
      if (flashRef.current) flashRef.current.visible = false;
    }
    prevProgressRef.current = progress;

    if (reducedMotion) {
      flashElapsedRef.current = PROGRESS_FLASH_DURATION;
      if (flashRef.current) flashRef.current.visible = false;
    } else if (flashElapsedRef.current < PROGRESS_FLASH_DURATION) {
      flashElapsedRef.current = Math.min(
        flashElapsedRef.current + delta,
        PROGRESS_FLASH_DURATION,
      );
      const flashT = flashElapsedRef.current / PROGRESS_FLASH_DURATION;
      const flash = flashRef.current;
      if (flash) {
        const flashScale = glowInner * (1 + flashT * 2.6);
        flash.scale.set(flashScale, flashScale, 1);
        (flash.material as THREE.SpriteMaterial).opacity =
          (1 - flashT) * (1 - flashT) * 0.5;
        flash.visible = flashT < 1;
      }
    }

    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse =
      !reducedMotion && isReading ? Math.sin(t * 1.3 + seed) * 0.04 : 0;
    groupRef.current.scale.setScalar(1 + pulse);
  });

  useEffect(
    () => () => {
      coreMat.dispose();
    },
    [coreMat],
  );

  useEffect(() => () => flashMat.dispose(), [flashMat]);

  useEffect(
    () => () => {
      hitMat.dispose();
      hitGeo.dispose();
    },
    [hitMat, hitGeo],
  );

  return (
    <group ref={groupRef} position={book.position}>
      <GlowSprite
        color={starColor}
        scale={glowOuter * BOOK_STAR_SCALE}
        opacity={glowOpacity.outer}
      />
      <GlowSprite
        color={starColor}
        scale={glowMid * BOOK_STAR_SCALE}
        opacity={glowOpacity.mid}
      />
      <GlowSprite
        color={starColor}
        scale={glowInner * BOOK_STAR_SCALE}
        opacity={glowOpacity.inner}
      />

      <StarSpikes
        color={starColor}
        size={spikeSize * BOOK_STAR_SCALE}
        opacity={spikeOpacity}
      />

      <sprite
        ref={coreRef}
        material={coreMat}
        scale={[coreScale * BOOK_STAR_SCALE, coreScale * BOOK_STAR_SCALE, 1]}
      />

      <sprite
        ref={flashRef}
        material={flashMat}
        visible={false}
        scale={[glowInner, glowInner, 1]}
      />

      {isSelected && (
        <Billboard>
          <mesh scale={BOOK_STAR_SCALE}>
            <ringGeometry args={[ringRadius, ringRadius + 0.02, 64]} />
            <meshBasicMaterial
              color="#a5b4fc"
              transparent
              opacity={0.6}
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      )}

      {/* biome-ignore lint: 3D Objects require pointer events for interaction */}
      <mesh
        geometry={hitGeo}
        material={hitMat}
        onClick={(e) => {
          e.stopPropagation();
          onClick(book);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(book.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          onHover(null);
        }}
      />
    </group>
  );
}

function ConstellationLines({
  books,
  lines,
  reducedMotion,
}: {
  books: Book[];
  lines: [string, string][];
  reducedMotion: boolean;
}) {
  const lineObjects = useMemo(() => {
    const makeLineMat = (color: string, opacity: number) =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

    return lines
      .map(([fromId, toId]) => {
        const from = books.find((b) => b.id === fromId);
        const to = books.find((b) => b.id === toId);
        if (!from || !to) return null;
        if (from.status !== "completed" || to.status !== "completed")
          return null;

        const pts = [
          new THREE.Vector3(...from.position),
          new THREE.Vector3(...to.position),
        ];
        const geo = () => new THREE.BufferGeometry().setFromPoints(pts);

        return {
          main: new THREE.Line(geo(), makeLineMat("#9ea8ec", 0.24)),
          glow: new THREE.Line(geo(), makeLineMat("#9ea8ec", 0.08)),
        };
      })
      .filter(Boolean) as { main: THREE.Line; glow: THREE.Line }[];
  }, [books, lines]);

  useEffect(
    () => () => {
      for (const { main, glow } of lineObjects) {
        main.geometry.dispose();
        glow.geometry.dispose();
        (main.material as THREE.Material).dispose();
        (glow.material as THREE.Material).dispose();
      }
    },
    [lineObjects],
  );

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    lineObjects.forEach(({ main, glow }, i) => {
      const pulse =
        0.24 + (reducedMotion ? 0 : Math.sin(t * 0.6 + i * 1.4) * 0.06);
      (main.material as THREE.LineBasicMaterial).opacity = pulse;
      (glow.material as THREE.LineBasicMaterial).opacity = pulse * 0.38;
    });
  });

  return (
    <>
      {lineObjects.map(({ main, glow }, i) => {
        const key = `line-${i}`;
        return (
          <group key={key}>
            <primitive object={main} />
            <primitive object={glow} />
          </group>
        );
      })}
    </>
  );
}

function StarBirthEffect({
  position,
  color,
  onComplete,
}: {
  position: [number, number, number];
  color: string;
  onComplete: () => void;
}) {
  const ref = useRef<THREE.Points>(null);
  const startTime = useRef<number | null>(null);

  const velocities = useMemo(() => {
    const pos = new Float32Array(BIRTH_EFFECT_COUNT * 3);
    for (let i = 0; i < BIRTH_EFFECT_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.3 + Math.random() * 0.7;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      pos[i * 3 + 2] = Math.cos(phi) * speed;
    }
    return pos;
  }, []);

  const initialPositions = useMemo(
    () => new Float32Array(velocities),
    [velocities],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (startTime.current === null) startTime.current = clock.elapsedTime;

    const progress = Math.min(
      (clock.elapsedTime - startTime.current) / BIRTH_EFFECT_DURATION,
      1,
    );

    const posAttr = ref.current.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < BIRTH_EFFECT_COUNT; i++) {
      posAttr.setXYZ(
        i,
        position[0] + initialPositions[i * 3] * progress * 2,
        position[1] + initialPositions[i * 3 + 1] * progress * 2,
        position[2] + initialPositions[i * 3 + 2] * progress * 2,
      );
    }
    posAttr.needsUpdate = true;

    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 1 - progress * progress;
    mat.size = 0.06 * (1 - progress * 0.5);

    if (progress >= 1) onComplete();
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[velocities, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface UniverseCanvasProps {
  books: Book[];
  matchingBookIds?: ReadonlySet<string>;
  constellationLines: [string, string][];
  onStarClick: (book: Book) => void;
  selectedBookId: string | null;
  newlyAddedBookId: string | null;
  onBirthEffectComplete: () => void;
}

export default function UniverseCanvas({
  books,
  matchingBookIds,
  constellationLines: lines,
  onStarClick,
  selectedBookId,
  newlyAddedBookId,
  onBirthEffectComplete,
}: UniverseCanvasProps) {
  const reducedMotion = useReducedMotion();
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);
  const controlsRef = useRef<{
    target: THREE.Vector3;
    update: () => void;
  } | null>(null);

  const newBook = newlyAddedBookId
    ? books.find((b) => b.id === newlyAddedBookId)
    : null;

  useEffect(() => {
    if (newlyAddedBookId && reducedMotion) onBirthEffectComplete();
  }, [newlyAddedBookId, reducedMotion, onBirthEffectComplete]);

  const motionSpeed = useCallback(
    (base: number) => (reducedMotion ? 0 : base),
    [reducedMotion],
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <Canvas
        camera={{ position: [0, 2, 20], fov: 60, near: 0.1, far: 300 }}
        style={{ background: "#040817" }}
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
        onPointerMissed={() => setHoveredBookId(null)}
      >
        <color attach="background" args={["#040817"]} />
        <Suspense fallback={null}>
          <Stars
            radius={80}
            depth={60}
            count={16000}
            factor={2}
            saturation={0.5}
            fade
            speed={motionSpeed(0.3)}
          />
          <Stars
            radius={22}
            depth={22}
            count={800}
            factor={1.3}
            saturation={0.9}
            fade
            speed={motionSpeed(0.6)}
          />
          {DUST_CLOUDS.map(({ color, count, speed, size }) => (
            <DustCloud
              key={color}
              color={color}
              count={count}
              speed={motionSpeed(speed)}
              size={size}
            />
          ))}
          <ConstellationLines
            books={books}
            lines={lines}
            reducedMotion={reducedMotion}
          />
          {books.map((book) => {
            const muted =
              matchingBookIds !== undefined && !matchingBookIds.has(book.id);
            const visibleBook: Book = muted
              ? { ...book, currentPage: 0, status: "unread" }
              : book;
            return (
              <BookStar
                key={`${book.id}:${muted ? "muted" : "visible"}`}
                book={visibleBook}
                onClick={() => onStarClick(book)}
                isSelected={selectedBookId === book.id}
                reducedMotion={reducedMotion}
                onHover={setHoveredBookId}
              />
            );
          })}
          {newBook && !reducedMotion && (
            <StarBirthEffect
              key={newBook.id}
              position={newBook.position}
              color={newBook.color}
              onComplete={onBirthEffectComplete}
            />
          )}
          <OrbitControls
            // biome-ignore lint/suspicious/noExplicitAny: drei ref type
            ref={controlsRef as any}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            minDistance={3}
            maxDistance={40}
            enablePan
          />
          <CameraSetup
            books={books}
            controlsRef={controlsRef}
            selectedBookId={selectedBookId}
          />

          <NebulaField
            reducedMotion={reducedMotion}
            empty={books.length === 0}
          />
          <NebulaFilaments reducedMotion={reducedMotion} />
          <BookLabels
            books={
              matchingBookIds === undefined
                ? books
                : books.filter((book) => matchingBookIds.has(book.id))
            }
            selectedBookId={selectedBookId}
            hoveredBookId={hoveredBookId}
            onSelect={onStarClick}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
