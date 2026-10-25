"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import styles from "@/components/observatory.module.css";
import type { Book } from "@/types/library";

export default function BookLabels({
  books,
  selectedBookId,
  hoveredBookId,
  onSelect,
}: {
  books: Book[];
  selectedBookId: string | null;
  hoveredBookId: string | null;
  onSelect: (book: Book) => void;
}) {
  const labels = useRef(new Map<string, HTMLButtonElement>());
  const position = useRef(new Vector3());

  useFrame(({ camera, size }) => {
    const mobile = size.width < 768;
    const width = mobile ? 120 : 164;
    const placed: { x: number; y: number }[] = [];
    const ordered = [...books].sort((a, b) => {
      const priority = (book: Book) =>
        book.id === selectedBookId ? 2 : book.id === hoveredBookId ? 1 : 0;
      return (
        priority(b) - priority(a) ||
        camera.position.distanceToSquared(position.current.set(...a.position)) -
          camera.position.distanceToSquared(position.current.set(...b.position))
      );
    });

    for (const book of ordered) {
      const label = labels.current.get(book.id);
      if (!label) continue;
      const projected = position.current.set(...book.position).project(camera);
      const x = ((projected.x + 1) * size.width) / 2 + 22;
      const y = ((1 - projected.y) * size.height) / 2 - 16;
      const isPriority =
        book.id === selectedBookId || book.id === hoveredBookId;
      const behindPanel =
        selectedBookId &&
        (mobile ? y > size.height * 0.5 : x + width > size.width - 536);
      const collides = placed.some(
        (other) =>
          Math.abs(other.x - x) < width + 12 && Math.abs(other.y - y) < 42,
      );
      const visible =
        projected.z > -1 &&
        projected.z < 1 &&
        x > 0 &&
        x + width < size.width - 12 &&
        y > 92 &&
        y < size.height - 100 &&
        !behindPanel &&
        !collides &&
        (isPriority || placed.length < (mobile ? 3 : 7));
      label.hidden = !visible;
      if (visible) {
        label.style.transform = `translate(${x}px, ${y}px)`;
        placed.push({ x, y });
      }
    }
  });

  return (
    <Html
      fullscreen
      zIndexRange={[10, 0]}
      style={{ pointerEvents: "none" }}
      calculatePosition={(_object, _camera, size) => [
        size.width / 2,
        size.height / 2,
      ]}
    >
      {books.map((book) => (
        <button
          key={book.id}
          type="button"
          hidden
          className={styles.starLabel}
          ref={(element) => {
            if (element) labels.current.set(book.id, element);
            else labels.current.delete(book.id);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "auto",
          }}
          data-book-label={book.id}
          data-selected={book.id === selectedBookId}
          aria-label={`本を開く: ${book.title}`}
          onClick={() => onSelect(book)}
          title={book.title}
        >
          {book.title}
        </button>
      ))}
    </Html>
  );
}
