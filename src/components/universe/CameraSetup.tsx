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
  selectedBookId: string | null;
}

export function CameraSetup(props: CameraSetupProps) {
  const { books, controlsRef, vrMode, gyroGranted, selectedBookId } = props;
  const { camera, size } = useThree();
  const initializedSize = useRef("");
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

  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    if (selectedBookId && !vrMode) {
      perspective.setViewOffset(
        size.width,
        size.height,
        size.width < 768 ? 0 : 200,
        size.width < 768 ? size.height * 0.22 : 0,
        size.width,
        size.height,
      );
    } else perspective.clearViewOffset();
    return () => perspective.clearViewOffset();
  }, [camera, selectedBookId, size, vrMode]);

  // 通常モードの初期カメラ配置
  useEffect(() => {
    const viewportKey = `${size.width}x${size.height}:${!!selectedBookId}`;
    if (initializedSize.current === viewportKey || books.length === 0) return;
    initializedSize.current = viewportKey;

    const { cx, cy, cz } = computeBounds();
    const halfWidth =
      books.reduce(
        (max, book) => Math.max(max, Math.abs(book.position[0] - cx)),
        0,
      ) + 1;
    const halfHeight =
      books.reduce(
        (max, book) => Math.max(max, Math.abs(book.position[1] - cy)),
        0,
      ) + 1;
    const depth = books.reduce(
      (max, book) => Math.max(max, book.position[2] - cz),
      0,
    );
    const fovRad = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
    const visibleWidth =
      selectedBookId && size.width >= 768
        ? Math.max(size.width - 540, size.width * 0.5)
        : size.width;
    const visibleHeight =
      selectedBookId && size.width < 768 ? size.height * 0.5 : size.height;
    const distance = Math.min(
      Math.max(
        halfWidth / ((Math.tan(fovRad / 2) * visibleWidth) / size.height),
        halfHeight / ((Math.tan(fovRad / 2) * visibleHeight) / size.height),
        4,
      ) *
        1.1 +
        depth,
      38,
    );

    camera.position.set(cx, cy, cz + distance);
    camera.lookAt(cx, cy, cz);
    controlsRef.current?.target.set(cx, cy, cz);
    controlsRef.current?.update();
  }, [books, camera, size, controlsRef, computeBounds, selectedBookId]);

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
