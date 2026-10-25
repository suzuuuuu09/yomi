"use client";

import { BookOpen, ChevronRight } from "lucide-react";
import styles from "@/components/observatory.module.css";
import type { Book } from "@/types/library";

export default function BottomDock({
  nowReading,
  onBookClick,
}: {
  nowReading: Book[];
  onBookClick: (book: Book) => void;
}) {
  const book = nowReading[0];
  if (!book) return null;

  return (
    <button
      type="button"
      className={styles.readingShortcut}
      onClick={() => onBookClick(book)}
      aria-label={`読書中の本を開く: ${book.title}`}
    >
      <BookOpen size={20} aria-hidden="true" />
      <span>読書中 — {book.title}</span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}
