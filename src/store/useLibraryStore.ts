import { create } from "zustand";
import type { Book, BookStatus } from "@/types/library";

const API_BASE = "/api/books";

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

export const CONSTELLATION_LINES: [string, string][] = [];

interface LibraryState {
  books: Book[];
  isLoading: boolean;
  selectedBookId: string | null;
  fetchBooks: () => Promise<void>;
  addBook: (partial: Partial<Book>) => void;
  setSelectedBook: (book: Book | null) => void;
  updatePageProgress: (bookId: string, delta: number) => void;
  setPageProgress: (bookId: string, page: number) => void;
  addNote: (bookId: string, content: string, page: number | null) => void;
  deleteNote: (bookId: string, noteId: string) => void;
}

const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  isLoading: false,
  selectedBookId: null,

  fetchBooks: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) {
        set({ books: [], isLoading: false });
        return;
      }
      const data: Book[] = await res.json();
      set({ books: data, isLoading: false });
    } catch {
      set({ books: [], isLoading: false });
    }
  },

  addBook: (partial) => {
    const position = randomPosition();
    const color =
      STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
    const brightness = 0.7 + Math.random() * 0.3;

    const tempId = `temp-${Date.now()}`;
    const newBook: Book = {
      id: tempId,
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
      position,
      brightness,
      color,
      notes: [],
    };
    set((state) => ({ books: [...state.books, newBook] }));

    // APIに保存
    fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...partial, position, brightness, color }),
    })
      .then((res) => res.json() as Promise<{ id: string }>)
      .then((data) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === tempId ? { ...b, id: data.id } : b,
          ),
        }));
      })
      .catch(() => {
        // 失敗時はローカルから削除
        set((state) => ({
          books: state.books.filter((b) => b.id !== tempId),
        }));
      });
  },

  setSelectedBook: (book) => set({ selectedBookId: book?.id ?? null }),

  updatePageProgress: (bookId, delta) => {
    const book = get().books.find((b) => b.id === bookId);
    if (!book) return;
    const newPage = Math.min(
      book.totalPages,
      Math.max(0, book.currentPage + delta),
    );
    // 楽観的更新
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, currentPage: newPage } : b,
      ),
    }));
    // APIに保存
    fetch(`${API_BASE}/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPage: newPage }),
    });
  },

  setPageProgress: (bookId, page) => {
    const book = get().books.find((b) => b.id === bookId);
    if (!book) return;
    const newPage = Math.min(book.totalPages, Math.max(0, page));
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, currentPage: newPage } : b,
      ),
    }));
    // APIに保存
    fetch(`${API_BASE}/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPage: newPage }),
    });
  },

  addNote: (bookId, content, page) => {
    const tempId = `note-${Date.now()}`;
    const now = new Date().toISOString();

    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              notes: [...b.notes, { id: tempId, content, page, createdAt: now }],
            }
          : b,
      ),
    }));
    // APIに保存
    fetch(`${API_BASE}/${bookId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, page }),
    })
      .then((res) => res.json() as Promise<{ id: string }>)
      .then((data) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId
              ? {
                  ...b,
                  notes: b.notes.map((n) =>
                    n.id === tempId ? { ...n, id: data.id } : n,
                  ),
                }
              : b,
          ),
        }));
      });
  },

  deleteNote: (bookId, noteId) => {
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? { ...b, notes: b.notes.filter((n) => n.id !== noteId) }
          : b,
      ),
    }));
    // APIに保存
    fetch(`${API_BASE}/${bookId}/notes/${noteId}`, {
      method: "DELETE",
    });
  },
}));

export default useLibraryStore;
