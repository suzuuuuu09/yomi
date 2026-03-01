import { create } from "zustand";
import { searchBooks, searchByISBN } from "@/lib/api";
import type { BookSearchState } from "@/types/book-search";

export const useBookSearchStore = create<BookSearchState>((set, get) => ({
  mode: "search",
  query: "",
  searchResults: [],
  totalItems: 0,
  currentPage: 1,
  isSearching: false,
  hasSearched: false,
  selectedResult: null,

  setMode: (mode) =>
    set({
      mode,
      searchResults: [],
      totalItems: 0,
      currentPage: 0,
      hasSearched: false,
      selectedResult: null,
      query: "",
    }),

  setQuery: (query) => set({ query }),

  setSelectedResult: (selectedResult) => set({ selectedResult }),

  fetchPage: async (page) => {
    const { mode, query } = get();
    const q = query.trim();
    if (!q) return;

    set({ isSearching: true, hasSearched: true });

    // 検索の個数
    const searchNumber = mode === "isbn" ? 1 : 10;
    const res =
      mode === "isbn"
        ? await searchByISBN(q)
        : await searchBooks(q, {
            index: page * searchNumber,
            results: searchNumber,
          });

    set({
      searchResults: res.books ?? [],
      totalItems: res.totalItems,
      currentPage: page,
      isSearching: false,
    });
  },

  reset: () =>
    set({
      query: "",
      searchResults: [],
      totalItems: 0,
      currentPage: 0,
      hasSearched: false,
      selectedResult: null,
      isSearching: false,
    }),
}));
