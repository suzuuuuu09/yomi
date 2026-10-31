import { create } from "zustand";

export interface ProgressPreview {
  bookId: string;
  page: number;
}

interface ProgressPreviewState {
  preview: ProgressPreview | null;
  setPreview: (bookId: string, page: number) => void;
  clearPreview: () => void;
}

export const useProgressPreviewStore = create<ProgressPreviewState>((set) => ({
  preview: null,
  setPreview: (bookId, page) => set({ preview: { bookId, page } }),
  clearPreview: () => set({ preview: null }),
}));

export default useProgressPreviewStore;
