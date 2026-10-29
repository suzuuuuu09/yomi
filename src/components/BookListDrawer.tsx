"use client";

import { Search, Star, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "@/components/book-list-drawer.module.css";
import { useBookCount } from "@/hooks/useBookCount";
import { useBookList } from "@/hooks/useBookList";
import useBookListStore from "@/store/useBookListStore";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book, BookStatus } from "@/types/library";

const FALLBACK_COVER = "/images/book-cover-fallback.png";
const MOBILE_QUERY = "(max-width: 767px)";

const FILTERS: { label: string; value: BookStatus | "all" }[] = [
  { label: "すべて", value: "all" },
  { label: "読書中", value: "reading" },
  { label: "未読", value: "unread" },
  { label: "読了", value: "completed" },
];

const STATUS_LABEL: Record<BookStatus, string> = {
  reading: "読書中",
  unread: "未読",
  completed: "読了",
};

function getPercentage(book: Book) {
  if (book.totalPages <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((book.currentPage / book.totalPages) * 100)),
  );
}

function BookCover({ book }: { book: Book }) {
  const [src, setSrc] = useState(book.coverUrl || FALLBACK_COVER);
  const [isFallback, setIsFallback] = useState(!book.coverUrl);

  useEffect(() => {
    setSrc(book.coverUrl || FALLBACK_COVER);
    setIsFallback(!book.coverUrl);
  }, [book.coverUrl]);

  return (
    <Image
      src={src.replace("http://", "https://")}
      alt={isFallback ? `${book.title}の代替書影` : `${book.title}の書影`}
      className={styles.cover}
      width={46}
      height={64}
      loading="lazy"
      unoptimized
      onError={() => {
        if (src === FALLBACK_COVER) return;
        setSrc(FALLBACK_COVER);
        setIsFallback(true);
      }}
    />
  );
}

function BookRow({
  book,
  isSelected,
  onSelect,
}: {
  book: Book;
  isSelected: boolean;
  onSelect: (book: Book) => void;
}) {
  const percentage = getPercentage(book);
  const totalPages =
    book.totalPages > 0 ? `${book.totalPages}ページ` : "ページ数未設定";

  return (
    <li>
      <button
        type="button"
        className={styles.row}
        data-book-row={book.id}
        data-selected={isSelected}
        aria-current={isSelected ? "true" : undefined}
        aria-label={`本を開く: ${book.title}、${book.author || "著者未設定"}、${book.currentPage} / ${totalPages}、${percentage}%${isSelected ? "、選択中" : ""}`}
        onClick={() => onSelect(book)}
      >
        <BookCover book={book} />
        <span className={styles.body}>
          <span className={styles.titleLine}>
            <span className={styles.title}>{book.title}</span>
            {isSelected && (
              <Star
                className={styles.selectedStar}
                size={12}
                fill="currentColor"
                aria-hidden="true"
              />
            )}
          </span>
          <span className={styles.author}>{book.author || "著者未設定"}</span>
          <span className={styles.meta}>
            <span>
              {book.currentPage} /{" "}
              {book.totalPages > 0 ? book.totalPages : "未設定"}ページ
            </span>
            <span className={styles.percent}>{percentage}%</span>
          </span>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${percentage}%` }} />
          </span>
        </span>
        <span className={styles.status} data-status={book.status}>
          {STATUS_LABEL[book.status]}
        </span>
      </button>
    </li>
  );
}

export default function BookListDrawer() {
  const books = useLibraryStore((s) => s.books);
  const selectedBookId = useLibraryStore((s) => s.selectedBookId);
  const setSelectedBook = useLibraryStore((s) => s.setSelectedBook);
  const isOpen = useBookListStore((s) => s.isOpen);
  const close = useBookListStore((s) => s.close);
  const { handleSelectBook } = useBookList();
  const counts = useBookCount();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BookStatus | "all">("all");

  const filtered = useMemo(() => {
    let result = books;
    if (filter !== "all") result = result.filter((b) => b.status === filter);
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q),
      );
    }
    return result;
  }, [books, filter, query]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const selectBook = (book: Book) => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia?.(MOBILE_QUERY).matches === true;
    if (isMobile) {
      handleSelectBook(book);
      return;
    }
    setSelectedBook(book);
  };

  const resetFilters = () => {
    setQuery("");
    setFilter("all");
  };

  return (
    <aside className={styles.panel} aria-labelledby="book-list-heading">
      <span className={styles.handle} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h2 id="book-list-heading" className={styles.heading}>
            本の一覧
          </h2>
          <span className={styles.total}>{counts.all}冊</span>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={close}
          aria-label="本の一覧を閉じる"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.search}>
        <Search className={styles.searchIcon} size={16} aria-hidden="true" />
        <input
          type="search"
          className={styles.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="タイトル・著者・ジャンル"
          aria-label="タイトル・著者・ジャンルで検索"
        />
        {query && (
          <button
            type="button"
            className={styles.clearSearch}
            onClick={() => setQuery("")}
            aria-label="検索をクリア"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      <fieldset className={styles.filters} aria-label="読書状態で絞り込む">
        {FILTERS.map((item) => {
          const count = counts[item.value];
          return (
            <button
              key={item.value}
              type="button"
              className={styles.filter}
              aria-pressed={filter === item.value}
              aria-label={`${item.label}（${count}冊）`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span className={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </fieldset>

      <p className={styles.resultCount} aria-live="polite">
        {filtered.length}冊を表示
      </p>

      <div className={styles.listWrap}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Search size={18} aria-hidden="true" />
            </span>
            <p className={styles.emptyTitle}>本が見つかりません</p>
            <p className={styles.emptyText}>
              検索語や読書状態を変えて、もう一度探してみてください。
            </p>
            {(query || filter !== "all") && (
              <button
                type="button"
                className={styles.reset}
                onClick={resetFilters}
              >
                条件をクリア
              </button>
            )}
          </div>
        ) : (
          <ul className={styles.list}>
            {filtered.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                isSelected={book.id === selectedBookId}
                onSelect={selectBook}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
