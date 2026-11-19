"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import Image from "next/image";
import { type SyntheticEvent, useRef } from "react";
import { Vector3 } from "three";
import styles from "@/components/observatory.module.css";
import labelStyles from "@/components/star-labels.module.css";
import searchStyles from "@/components/star-search.module.css";
import useBookListStore from "@/store/useBookListStore";
import useLibraryFilterStore from "@/store/useLibraryFilterStore";
import useLibraryStore from "@/store/useLibraryStore";
import useProgressPreviewStore from "@/store/useProgressPreviewStore";
import type { Book } from "@/types/library";

const FALLBACK_COVER_URL = "/images/book-cover-fallback.png";

function resolveCoverUrl(coverUrl: string) {
  const value = coverUrl.trim();
  if (!value) return FALLBACK_COVER_URL;
  return value.replace(/^http:\/\//i, "https://");
}

function handleCoverError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (!image.src.endsWith(FALLBACK_COVER_URL)) {
    image.src = FALLBACK_COVER_URL;
  }
}

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
  const connector = useRef<HTMLDivElement>(null);
  const toolConnector = useRef<HTMLDivElement>(null);
  const position = useRef(new Vector3());
  const query = useLibraryFilterStore((state) => state.query);
  const activeFilter = useLibraryFilterStore((state) => state.activeFilter);
  const genre = useLibraryFilterStore((state) => state.genre);
  const listOpen = useBookListStore((state) => state.isOpen);
  const closeList = useBookListStore((state) => state.close);
  const savedBooks = useLibraryStore((state) => state.books);
  const preview = useProgressPreviewStore((state) => state.preview);
  const searchActive =
    query.length > 0 || activeFilter !== "all" || genre !== "all";

  useFrame(({ camera, size }) => {
    const activeBook = books.find((item) => item.id === selectedBookId);
    const line = connector.current;
    if (line) {
      const row = listOpen
        ? document.querySelector<HTMLElement>(
            '[data-book-row][data-selected="true"]',
          )
        : null;
      if (!row || !activeBook) {
        line.hidden = true;
      } else {
        const bounds = row.getBoundingClientRect();
        const clip = row.closest("ul")?.parentElement?.getBoundingClientRect();
        const point = position.current
          .set(...activeBook.position)
          .project(camera);
        const x = ((point.x + 1) * size.width) / 2;
        const y = ((1 - point.y) * size.height) / 2;
        const startX = bounds.right;
        const startY = bounds.top + bounds.height / 2;
        const dx = x - startX;
        const dy = y - startY;
        line.hidden =
          point.z <= -1 ||
          point.z >= 1 ||
          dx <= 0 ||
          (clip !== undefined && (startY < clip.top || startY > clip.bottom));
        if (!line.hidden) {
          line.style.width = `${Math.hypot(dx, dy)}px`;
          line.style.transform = `translate(${startX}px, ${startY}px) rotate(${Math.atan2(dy, dx)}rad)`;
        }
      }
    }

    const toolLine = toolConnector.current;
    if (toolLine) {
      const tool = document.querySelector<HTMLElement>(
        '[data-star-tool="edit"], [data-star-tool="progress"]',
      );
      if (!tool || !activeBook) {
        toolLine.hidden = true;
      } else {
        const bounds = tool.getBoundingClientRect();
        const point = position.current
          .set(...activeBook.position)
          .project(camera);
        const x = ((point.x + 1) * size.width) / 2;
        const y = ((1 - point.y) * size.height) / 2;
        const edgeX = x < bounds.left ? bounds.left : bounds.right;
        const edgeY = Math.max(
          bounds.top + 20,
          Math.min(y, bounds.bottom - 20),
        );
        const dx = edgeX - x;
        const dy = edgeY - y;
        toolLine.hidden =
          point.z <= -1 ||
          point.z >= 1 ||
          (x >= bounds.left && x <= bounds.right) ||
          x < 0 ||
          x > size.width ||
          y < 0 ||
          y > size.height;
        if (!toolLine.hidden) {
          toolLine.style.width = `${Math.hypot(dx, dy)}px`;
          toolLine.style.transform = `translate(${x}px, ${y}px) rotate(${Math.atan2(dy, dx)}rad)`;
        }
      }
    }

    const mobile = size.width < 768;
    const panels = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-star-tool], [data-star-detail]:not([hidden]), [data-book-list-panel]",
      ),
    ).map((panel) => panel.getBoundingClientRect());
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
      const rich = searchActive || book.id === selectedBookId;
      const width = rich ? (mobile ? 220 : 300) : mobile ? 120 : 164;
      const height = rich ? (mobile ? 80 : 110) : 36;
      const projected = position.current.set(...book.position).project(camera);
      const x = ((projected.x + 1) * size.width) / 2 + (mobile ? 24 : 56);
      const y = ((1 - projected.y) * size.height) / 2 - height - 24;
      const isPriority =
        book.id === selectedBookId || book.id === hoveredBookId;
      const behindPanel = panels.some(
        (panel) =>
          x < panel.right &&
          x + width > panel.left &&
          y < panel.bottom &&
          y + height > panel.top,
      );
      const collides = placed.some(
        (other) =>
          Math.abs(other.x - x) < width + 12 &&
          Math.abs(other.y - y) < height + 8,
      );
      const fitsBottom = searchActive
        ? y + height < size.height - 12
        : y < size.height - 100;
      const visible =
        projected.z > -1 &&
        projected.z < 1 &&
        x > 0 &&
        x + width < size.width - 12 &&
        y > 92 &&
        fitsBottom &&
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
      <div ref={connector} className={searchStyles.connector} hidden />
      <div ref={toolConnector} className={searchStyles.connector} hidden />
      {books.map((book) => {
        const savedBook =
          savedBooks.find((item) => item.id === book.id) ?? book;
        const selected = book.id === selectedBookId;
        const rich = searchActive || selected;
        const withCover = searchActive || (selected && listOpen);
        const progress =
          book.totalPages > 0
            ? Math.min(
                100,
                Math.round((book.currentPage / book.totalPages) * 100),
              )
            : 0;

        return (
          <button
            key={book.id}
            type="button"
            hidden
            className={
              rich
                ? `${searchStyles.searchLabel} ${labelStyles.callout}${withCover ? "" : ` ${labelStyles.selected}`}${listOpen ? ` ${labelStyles.compact}` : ""}`
                : `${styles.starLabel} ${labelStyles.callout}`
            }
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
            onClick={() => {
              onSelect(savedBook);
              if (listOpen) closeList();
            }}
            title={book.title}
          >
            {rich ? (
              <>
                {withCover && (
                  <span className={searchStyles.coverFrame}>
                    <Image
                      src={resolveCoverUrl(book.coverUrl)}
                      alt=""
                      aria-hidden="true"
                      width={40}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      unoptimized
                      className={searchStyles.coverImage}
                      onError={handleCoverError}
                    />
                  </span>
                )}
                <span className={searchStyles.details}>
                  <span className={searchStyles.title}>{book.title}</span>
                  {withCover && (
                    <span className={searchStyles.author}>
                      {book.author || "著者未設定"}
                    </span>
                  )}
                  <span className={searchStyles.meta}>
                    <span className={searchStyles.pages}>
                      {savedBook.currentPage} /{" "}
                      {book.totalPages > 0 ? book.totalPages : "未設定"}
                      ページ
                    </span>
                    <span className={searchStyles.percent}>
                      {savedBook.totalPages > 0
                        ? Math.round(
                            (savedBook.currentPage / savedBook.totalPages) *
                              100,
                          )
                        : 0}
                      %
                      {preview?.bookId === book.id &&
                        preview.page !== savedBook.currentPage && (
                          <span className={labelStyles.preview}>
                            {" "}
                            → {progress}%
                          </span>
                        )}
                    </span>
                  </span>
                  <span className={labelStyles.track} aria-hidden="true">
                    <span
                      className={labelStyles.fill}
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                </span>
              </>
            ) : (
              book.title
            )}
          </button>
        );
      })}
    </Html>
  );
}
