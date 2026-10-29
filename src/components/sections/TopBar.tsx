"use client";

import { Library, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/components/observatory.module.css";
import type { FilterTabsCounts } from "@/components/shares/FilterTabs";
import FilterTabs from "@/components/shares/FilterTabs";
import UserMenu from "@/components/shares/UserMenu";
import searchStyles from "@/components/star-search.module.css";
import useBookListStore from "@/store/useBookListStore";
import useLibraryFilterStore from "@/store/useLibraryFilterStore";

export default function TopBar({ bookCount }: { bookCount: FilterTabsCounts }) {
  const { activeFilter, query, setFilter, setQuery, clearSearch } =
    useLibraryFilterStore();
  const openBookList = useBookListStore((state) => state.open);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    clearSearch();
    setFilter("all");
    triggerRef.current?.focus();
  }, [clearSearch, setFilter]);

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (bookCount.all === 0) setIsSearchOpen(false);
  }, [bookCount.all]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        closeSearch();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [isSearchOpen, closeSearch]);

  return (
    <header
      ref={headerRef}
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
              onClick={() => {
                closeSearch();
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
              size={17}
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
                <X size={15} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className={searchStyles.closeButton}
              onClick={closeSearch}
              aria-label="検索を解除して閉じる"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className={searchStyles.filters}>
            <FilterTabs
              activeFilter={activeFilter}
              setFilter={setFilter}
              counts={bookCount}
            />
          </div>
        </section>
      )}
    </header>
  );
}
