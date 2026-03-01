import { create } from "zustand";
import type { BookStatus } from "@/types/library";

interface LibraryFilterState {
  activeFilter: BookStatus | "all";
  query: string;
  setFilter: (filter: BookStatus | "all") => void;
  setQuery: (query: string) => void;
  clearSearch: () => void;
}

const useLibraryFilterStore = create<LibraryFilterState>((set) => ({
  activeFilter: "all",
  query: "",
  setFilter: (filter) => set({ activeFilter: filter }),
  setQuery: (query) => set({ query }),
  clearSearch: () => set({ query: "" }),
}));

export default useLibraryFilterStore;
