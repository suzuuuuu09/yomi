"use client";

import { Library, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/components/observatory.module.css";
import type { FilterTabsCounts } from "@/components/shares/FilterTabs";
import FilterTabs from "@/components/shares/FilterTabs";
import UserMenu from "@/components/shares/UserMenu";
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
    <header ref={headerRef} className={styles.header}>
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
          className={styles.searchPanel}
          aria-label="蔵書を検索"
        >
          <div className={styles.searchRow}>
            <input
              ref={searchRef}
              type="search"
              className={styles.searchInput}
              aria-label="タイトル・著者・ジャンルで検索"
              placeholder="タイトル・著者・ジャンル"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={closeSearch}
              aria-label="検索を解除して閉じる"
            >
              <X size={18} />
            </button>
          </div>
          <FilterTabs
            activeFilter={activeFilter}
            setFilter={setFilter}
            counts={bookCount}
          />
        </section>
      )}
    </header>
  );
}
