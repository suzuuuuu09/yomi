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
  selectedBookId: string | null;
}

export function CameraSetup(props: CameraSetupProps) {
  const { books, controlsRef, selectedBookId } = props;
  const { camera, size } = useThree();
  const initializedSize = useRef("");

  // 本の重心を計算する
  const computeBounds = useCallback(() => {
    const n = books.length;

    if (n === 0) return { cx: 0, cy: 0, cz: 0 }; // 欲がないときは原点

    const cx = books.reduce((sum, b) => sum + b.position[0], 0) / n;
    const cy = books.reduce((sum, b) => sum + b.position[1], 0) / n;
    const cz = books.reduce((sum, b) => sum + b.position[2], 0) / n;
    /* let cx = 0,
      cy = 0,
      cz = 0; */
    return { cx, cy, cz };
  }, [books]);

  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    if (selectedBookId) {
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
  }, [camera, selectedBookId, size]);

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

  return null;
}
