import { create } from "zustand";
import { searchBooks, searchByISBN } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import type { BookSearchState } from "@/types/book-search";

let activeSearchRequest = 0;

export const useBookSearchStore = create<BookSearchState>((set, get) => ({
  mode: "search",
  query: "",
  searchResults: [],
  totalItems: 0,
  currentPage: 1,
  isSearching: false,
  error: null,
  hasSearched: false,
  selectedResult: null,

  setMode: (mode) => {
    activeSearchRequest += 1;
    set({
      mode,
      searchResults: [],
      totalItems: 0,
      currentPage: 0,
      error: null,
      hasSearched: false,
      selectedResult: null,
      query: "",
      isSearching: false,
    });
  },

  setQuery: (query) => {
    activeSearchRequest += 1;
    set({ query, isSearching: false, error: null });
  },

  setSelectedResult: (selectedResult) => set({ selectedResult }),

  fetchPage: async (page) => {
    const { mode, query } = get();
    const q = query.trim();
    if (!q) return;

    const requestId = ++activeSearchRequest;
    set({ isSearching: true, error: null, hasSearched: true });

    try {
      // 検索の個数
      const searchNumber = mode === "isbn" ? 1 : 20;
      const res =
        mode === "isbn"
          ? await searchByISBN(q)
          : await searchBooks(q, {
              index: page * searchNumber,
              results: searchNumber,
            });

      if (requestId !== activeSearchRequest) return;
      set({
        searchResults: res.books ?? [],
        totalItems: res.totalItems,
        currentPage: page,
        error: null,
      });
    } catch (error) {
      if (requestId !== activeSearchRequest) return;
      set({ error: getApiErrorMessage(error, "検索に失敗しました。") });
    } finally {
      if (requestId === activeSearchRequest) set({ isSearching: false });
    }
  },

  reset: () => {
    activeSearchRequest += 1;
    set({
      query: "",
      searchResults: [],
      totalItems: 0,
      currentPage: 0,
      error: null,
      hasSearched: false,
      selectedResult: null,
      isSearching: false,
    });
  },
}));
