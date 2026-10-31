import { create } from "zustand";

export type ObservatoryPanel =
  | "list"
  | "search"
  | "settings"
  | "add"
  | "progress"
  | "edit"
  | "delete";

interface BookListState {
  activePanel: ObservatoryPanel | null;
  isOpen: boolean;
  setPanel: (panel: ObservatoryPanel | null) => void;
  closePanel: (panel: ObservatoryPanel) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const useBookListStore = create<BookListState>((set) => ({
  activePanel: null,
  isOpen: false,
  setPanel: (activePanel) =>
    set({ activePanel, isOpen: activePanel === "list" }),
  closePanel: (panel) =>
    set((state) =>
      state.activePanel === panel
        ? { activePanel: null, isOpen: false }
        : state,
    ),
  open: () => set({ activePanel: "list", isOpen: true }),
  close: () =>
    set((state) =>
      state.activePanel === "list"
        ? { activePanel: null, isOpen: false }
        : state,
    ),
  toggle: () =>
    set((state) => ({
      activePanel: state.isOpen ? null : "list",
      isOpen: !state.isOpen,
    })),
}));

export default useBookListStore;
