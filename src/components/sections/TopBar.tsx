"use client";

import { ChevronDown, Library, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import styles from "@/components/observatory.module.css";
import CloseButton from "@/components/shares/CloseButton";
import type { FilterTabsCounts } from "@/components/shares/FilterTabs";
import UserMenu from "@/components/shares/UserMenu";
import searchStyles from "@/components/star-search.module.css";
import { getGenreOptions } from "@/hooks/useFilteredBooks";
import useBookListStore from "@/store/useBookListStore";
import useLibraryFilterStore, {
  ALL_GENRES,
} from "@/store/useLibraryFilterStore";
import useLibraryStore from "@/store/useLibraryStore";
import type { BookStatus } from "@/types/library";

const FILTERS: { label: string; value: BookStatus | "all" }[] = [
  { label: "すべて", value: "all" },
  { label: "未読", value: "unread" },
  { label: "読書中", value: "reading" },
  { label: "読了", value: "completed" },
];

export default function TopBar({ bookCount }: { bookCount: FilterTabsCounts }) {
  const {
    activeFilter,
    query,
    genre,
    setFilter,
    setQuery,
    setGenre,
    resetFilters,
  } = useLibraryFilterStore();
  const books = useLibraryStore((state) => state.books);
  const openBookList = useBookListStore((state) => state.open);
  const isBookListOpen = useBookListStore((state) => state.isOpen);
  const isSearchOpen = useBookListStore(
    (state) => state.activePanel === "search",
  );
  const setIsSearchOpen = useCallback((open: boolean) => {
    const ui = useBookListStore.getState();
    if (open) ui.setPanel("search");
    else ui.closePanel("search");
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const genreOptions = useMemo(() => getGenreOptions(books), [books]);

  const closeSearch = useCallback(
    (restoreFocus = true) => {
      setIsSearchOpen(false);
      resetFilters();
      if (restoreFocus) triggerRef.current?.focus();
    },
    [resetFilters, setIsSearchOpen],
  );

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (bookCount.all === 0) setIsSearchOpen(false);
  }, [bookCount.all, setIsSearchOpen]);

  useEffect(() => {
    if (
      genre !== ALL_GENRES &&
      !genreOptions.some((item) => item.id === genre)
    ) {
      setGenre(ALL_GENRES);
    }
  }, [genre, genreOptions, setGenre]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        closeSearch();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSearchOpen, closeSearch]);

  return (
    <header
      className={`${styles.header}${
        isSearchOpen ? ` ${searchStyles.headerActive}` : ""
      }`}
    >
      <span className={styles.logo}>YOMi</span>
      <nav className={styles.navigation} aria-label="本と設定">
        {bookCount.all > 0 && (
          <>
            <button
              ref={triggerRef}
              type="button"
              className={styles.glassButton}
              aria-expanded={isSearchOpen}
              aria-controls="library-search"
              onClick={() =>
                isSearchOpen ? closeSearch() : setIsSearchOpen(true)
              }
            >
              <Search size={18} aria-hidden="true" />
              <span>検索</span>
            </button>
            <button
              type="button"
              className={styles.glassButton}
              aria-pressed={isBookListOpen}
              onClick={() => {
                closeSearch(false);
                openBookList();
              }}
            >
              <Library size={18} aria-hidden="true" />
              <span>本の一覧</span>
            </button>
          </>
        )}
        <UserMenu />
      </nav>
      {isSearchOpen && bookCount.all > 0 && (
        <section
          id="library-search"
          className={searchStyles.panel}
          aria-label="蔵書を検索"
        >
          <div className={searchStyles.field}>
            <Search
              size={19}
              className={searchStyles.searchIcon}
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              className={searchStyles.input}
              aria-label="タイトル・著者・ジャンルで検索"
              placeholder="タイトル・著者・ジャンル"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className={searchStyles.clearButton}
                onClick={() => setQuery("")}
                aria-label="検索語を消去"
              >
                消去
              </button>
            )}
            <CloseButton
              className={searchStyles.closeButton}
              onClick={() => closeSearch()}
              aria-label="検索を閉じる"
            />
          </div>
          <div className={searchStyles.filters}>
            <fieldset
              className={searchStyles.tabs}
              aria-label="読書状態で絞り込む"
            >
              {FILTERS.map((item) => {
                const count = bookCount[item.value];
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={searchStyles.tab}
                    aria-pressed={activeFilter === item.value}
                    aria-label={`${item.label}（${count}冊）`}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                    <span className={searchStyles.tabCount}>({count})</span>
                  </button>
                );
              })}
            </fieldset>
            <label className={searchStyles.genreField}>
              <span className={searchStyles.srOnly}>ジャンルで絞り込む</span>
              <select
                className={searchStyles.genreSelect}
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              >
                <option value={ALL_GENRES}>ジャンル: すべて</option>
                {genreOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className={searchStyles.genreChevron}
                aria-hidden="true"
              />
            </label>
          </div>
        </section>
      )}
    </header>
  );
}
