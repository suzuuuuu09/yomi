import { create } from "zustand";
import type { BookStatus } from "@/types/library";

export const ALL_GENRES = "all";

interface LibraryFilterState {
  activeFilter: BookStatus | "all";
  query: string;
  genre: string;
  setFilter: (filter: BookStatus | "all") => void;
  setQuery: (query: string) => void;
  setGenre: (genre: string) => void;
  clearSearch: () => void;
  resetFilters: () => void;
}

const useLibraryFilterStore = create<LibraryFilterState>((set) => ({
  activeFilter: "all",
  query: "",
  genre: ALL_GENRES,
  setFilter: (filter) => set({ activeFilter: filter }),
  setQuery: (query) => set({ query }),
  setGenre: (genre) => set({ genre }),
  clearSearch: () => set({ query: "", genre: ALL_GENRES }),
  resetFilters: () =>
    set({ activeFilter: "all", query: "", genre: ALL_GENRES }),
}));

export default useLibraryFilterStore;
