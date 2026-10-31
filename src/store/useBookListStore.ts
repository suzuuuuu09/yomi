import { create } from "zustand";

interface BookListState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const useBookListStore = create<BookListState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

export default useBookListStore;
