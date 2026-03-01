import { create } from "zustand";
import { mockBooks } from "@/mock/books";
import type { Book, BookStatus } from "@/types/library";

const STAR_COLORS = [
  "#818cf8",
  "#a855f7",
  "#ec4899",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
];

function randomPosition(): [number, number, number] {
  return [
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 10,
  ];
}

export const CONSTELLATION_LINES: [string, string][] = [
  ["book-1", "book-4"],
  ["book-3", "book-4"],
  ["book-3", "book-8"],
  ["book-2", "book-7"],
  ["book-5", "book-7"],
];

interface LibraryState {
  books: Book[];
  selectedBookId: string | null;
  addBook: (partial: Partial<Book>) => void;
  setSelectedBook: (book: Book | null) => void;
  updatePageProgress: (bookId: string, delta: number) => void;
  setPageProgress: (bookId: string, page: number) => void;
  addNote: (bookId: string, content: string, page: number | null) => void;
  deleteNote: (bookId: string, noteId: string) => void;
}

const useLibraryStore = create<LibraryState>((set) => ({
  books: mockBooks,
  selectedBookId: null,

  addBook: (partial) =>
    set((state) => {
      const newBook: Book = {
        id: `book-${Date.now()}`,
        title: partial.title ?? "",
        author: partial.author ?? "",
        isbn: partial.isbn ?? "",
        totalPages: partial.totalPages ?? 0,
        currentPage: partial.currentPage ?? 0,
        status: (partial.status as BookStatus) ?? "unread",
        genre: partial.genre ?? "",
        coverUrl: partial.coverUrl ?? "",
        registeredAt: new Date().toISOString(),
        completedAt: null,
        position: randomPosition(),
        brightness: 0.7 + Math.random() * 0.3,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        notes: [],
      };
      return { books: [...state.books, newBook] };
    }),

  setSelectedBook: (book) => set({ selectedBookId: book?.id ?? null }),

  updatePageProgress: (bookId, delta) =>
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              currentPage: Math.min(
                b.totalPages,
                Math.max(0, b.currentPage + delta),
              ),
            }
          : b,
      ),
    })),

  setPageProgress: (bookId, page) =>
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? { ...b, currentPage: Math.min(b.totalPages, Math.max(0, page)) }
          : b,
      ),
    })),

  addNote: (bookId, content, page) =>
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              notes: [
                ...b.notes,
                {
                  id: `note-${Date.now()}`,
                  content,
                  page,
                  createdAt: new Date().toLocaleDateString("ja-JP"),
                },
              ],
            }
          : b,
      ),
    })),

  deleteNote: (bookId, noteId) =>
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? { ...b, notes: b.notes.filter((n) => n.id !== noteId) }
          : b,
      ),
    })),
}));

export default useLibraryStore;
