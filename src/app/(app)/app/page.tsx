"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import BookListDrawer from "@/components/BookListDrawer";
import styles from "@/components/observatory.module.css";
import SessionGuard from "@/components/SessionGuard";
import StarInsightPanel from "@/components/StarInsightPanel";
import AddBookModal from "@/components/sections/AddBookModal";
import BottomDock from "@/components/sections/BottomDock";
import ObservatoryEmptyState from "@/components/sections/ObservatoryEmptyState";
import TopBar from "@/components/sections/TopBar";
import { useObservatory } from "@/hooks/useObservatory";
import { useStarInsight } from "@/hooks/useStarInsight";
import useLibraryFilterStore from "@/store/useLibraryFilterStore";
import useLibraryStore from "@/store/useLibraryStore";
import useProgressPreviewStore from "@/store/useProgressPreviewStore";
import type { BookStatus } from "@/types/library";

const UniverseCanvas = dynamic(
  () => import("@/components/universe/UniverseCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className={styles.statusMessage} role="status">
        宇宙を展開中...
      </div>
    ),
  },
);

function ObservatoryContent() {
  const books = useLibraryStore((state) => state.books);
  const constellationLines = useLibraryStore(
    (state) => state.constellationLines,
  );
  const fetchBooks = useLibraryStore((state) => state.fetchBooks);
  const isLoading = useLibraryStore((state) => state.isLoading);
  const newlyAddedBookId = useLibraryStore((state) => state.newlyAddedBookId);
  const clearNewlyAdded = useLibraryStore((state) => state.clearNewlyAdded);
  const lastError = useLibraryStore((state) => state.lastError);
  const clearMutationError = useLibraryStore(
    (state) => state.clearMutationError,
  );
  const setSelectedBook = useLibraryStore((state) => state.setSelectedBook);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  const loadBooks = useCallback(async () => {
    setLoadState("loading");
    await fetchBooks();
    setLoadState(useLibraryStore.getState().lastError ? "failed" : "loaded");
  }, [fetchBooks]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const {
    filteredBooks,
    bookCount,
    selectedBookId,
    isAddModalOpen,
    setIsAddModalOpen,
    handleStarClick,
    handleAdd,
  } = useObservatory();
  const starInsight = useStarInsight();
  const preview = useProgressPreviewStore((state) => state.preview);
  const visibleBooks = useMemo(() => {
    if (!preview || preview.bookId !== selectedBookId) return books;

    return books.map((book) => {
      if (book.id !== preview.bookId) return book;

      const status: BookStatus =
        preview.page <= 0
          ? "unread"
          : book.totalPages > 0 && preview.page >= book.totalPages
            ? "completed"
            : "reading";
      return { ...book, currentPage: preview.page, status };
    });
  }, [books, preview, selectedBookId]);
  const matchingBookIds = useMemo(
    () =>
      filteredBooks === books
        ? undefined
        : new Set(filteredBooks.map((book) => book.id)),
    [books, filteredBooks],
  );
  const ready = loadState === "loaded" && !isLoading;
  const empty = ready && books.length === 0 && !lastError;
  const nowReading = books.filter((book) => book.status === "reading");
  const openAdd = () => setIsAddModalOpen(true);

  return (
    <main className={styles.observatory}>
      <UniverseCanvas
        books={visibleBooks}
        matchingBookIds={matchingBookIds}
        constellationLines={constellationLines}
        onStarClick={handleStarClick}
        selectedBookId={selectedBookId}
        newlyAddedBookId={newlyAddedBookId}
        onBirthEffectComplete={clearNewlyAdded}
      />
      <TopBar bookCount={bookCount} />
      {lastError && (
        <div role="alert" className={styles.error}>
          <span>{lastError}</span>
          <button type="button" onClick={clearMutationError}>
            閉じる
          </button>
        </div>
      )}
      {(loadState === "loading" || isLoading) && (
        <div className={styles.statusMessage} role="status">
          本を読み込み中...
        </div>
      )}
      {empty && <ObservatoryEmptyState onAdd={openAdd} />}
      {loadState === "failed" && books.length === 0 && (
        <div className={styles.statusMessage}>
          <button
            type="button"
            className={styles.glassButton}
            onClick={() => void loadBooks()}
          >
            本を再読み込み
          </button>
        </div>
      )}
      {books.length > 0 && (
        <>
          {filteredBooks.length === 0 && (
            <div className={styles.statusMessage} role="status">
              <p>条件に合う本が見つかりません。</p>
              <button
                type="button"
                className={styles.glassButton}
                onClick={() => {
                  useLibraryFilterStore.getState().clearSearch();
                  useLibraryFilterStore.getState().setFilter("all");
                }}
              >
                すべての星を表示
              </button>
            </div>
          )}
          <div className={styles.addButton} data-selected={!!selectedBookId}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openAdd}
              aria-label="本を追加"
            >
              <Plus size={24} aria-hidden="true" />
              <span className={styles.addLabel}>本を追加</span>
            </button>
          </div>
          <div
            className={styles.readingAccess}
            data-selected={!!selectedBookId}
          >
            <BottomDock nowReading={nowReading} onBookClick={setSelectedBook} />
          </div>
        </>
      )}
      <AddBookModal
        isOpen={isAddModalOpen}
        onCloseAction={() => setIsAddModalOpen(false)}
        onAddAction={handleAdd}
      />
      <BookListDrawer />
      <StarInsightPanel key={selectedBookId} {...starInsight} />
    </main>
  );
}

export default function Observatory() {
  return (
    <SessionGuard>
      <ObservatoryContent />
    </SessionGuard>
  );
}
