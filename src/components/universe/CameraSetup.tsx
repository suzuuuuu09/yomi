"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import type { PerspectiveCamera, Vector3 } from "three";
import type { Book } from "@/types/library";

type ControlsRef = React.RefObject<{
  target: Vector3;
  update: () => void;
} | null>;

interface CameraSetupProps {
  books: Book[];
  controlsRef: ControlsRef;
  vrMode: boolean;
  gyroGranted: boolean;
}

export function CameraSetup(props: CameraSetupProps) {
  const { books, controlsRef, vrMode, gyroGranted } = props;
  const { camera, size } = useThree();
  const initialized = useRef(false);
  const vrPositioned = useRef(false);

  // 重心と分布半径を計算するユーティリティ
  const computeBounds = useCallback(() => {
    const n = books.length;

    if (n === 0) return { cx: 0, cy: 0, cz: 0, radius: 1 }; // 欲がないときは原点

    const cx = books.reduce((sum, b) => sum + b.position[0], 0) / n;
    const cy = books.reduce((sum, b) => sum + b.position[1], 0) / n;
    const cz = books.reduce((sum, b) => sum + b.position[2], 0) / n;
    /* let cx = 0,
      cy = 0,
      cz = 0; */
    const radius = books.reduce((max, b) => {
      const d = Math.hypot(
        b.position[0] - cx,
        b.position[1] - cy,
        b.position[2] - cz,
      );
      return Math.max(max, d);
    }, 0);
    return { cx, cy, cz, radius };
  }, [books]);

  // 通常モードの初期カメラ配置
  useEffect(() => {
    if (initialized.current || books.length === 0) return;
    initialized.current = true;

    const { cx, cy, cz, radius } = computeBounds();
    const r = Math.max(radius + 2.5, 4);
    const fovRad = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
    const hFovRad =
      2 * Math.atan(Math.tan(fovRad / 2) * (size.width / size.height));
    const distance = Math.min(
      Math.max(r / Math.tan(fovRad / 2), r / Math.tan(hFovRad / 2)) * 1.15,
      38,
    );

    camera.position.set(cx, cy, cz + distance);
    camera.lookAt(cx, cy, cz);
    controlsRef.current?.target.set(cx, cy, cz);
    controlsRef.current?.update();
  }, [books, camera, size, controlsRef, computeBounds]);

  // VRモード時のカメラ配置: 全体を適度に俯瞰できる位置へ
  useEffect(() => {
    if (!vrMode || !gyroGranted || books.length === 0) {
      vrPositioned.current = false;
      return;
    }
    if (vrPositioned.current) return;
    vrPositioned.current = true;

    const { cx, cy, cz, radius } = computeBounds();
    const vrDist = Math.min(Math.max(radius * 0.45, 3), 12);
    camera.position.set(cx, cy, cz + vrDist);
    camera.lookAt(cx, cy, cz);
  }, [vrMode, gyroGranted, books, camera, computeBounds]);

  return null;
}
