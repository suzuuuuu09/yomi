import { create } from "zustand";
import type { Book, BookStatus } from "@/types/library";

const API_BASE = "/api/books";

interface LibraryState {
  books: Book[];
  constellationLines: [string, string][];
  isLoading: boolean;
  selectedBookId: string | null;
  fetchBooks: () => Promise<void>;
  addBook: (partial: Partial<Book>) => void;
  deleteBook: (bookId: string) => void;
  setSelectedBook: (book: Book | null) => void;
  updatePageProgress: (bookId: string, delta: number) => void;
  setPageProgress: (bookId: string, page: number) => void;
  addNote: (bookId: string, content: string, page: number | null) => void;
  deleteNote: (bookId: string, noteId: string) => void;
}

interface FetchBooksResponse {
  books: Book[];
  constellationLines: [string, string][];
}

interface CreateBookResponse {
  id: string;
  position: [number, number, number];
  brightness: number;
  color: string;
}

interface UpdateBookResponse {
  ok: boolean;
  brightness: number;
  color: string;
}

const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  constellationLines: [],
  isLoading: false,
  selectedBookId: null,

  fetchBooks: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) {
        set({ books: [], constellationLines: [], isLoading: false });
        return;
      }
      const data = (await res.json()) as FetchBooksResponse;
      set({
        books: data.books,
        constellationLines: data.constellationLines,
        isLoading: false,
      });
    } catch {
      set({ books: [], constellationLines: [], isLoading: false });
    }
  },

  addBook: (partial) => {
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
      position: [0, 0, 0],
      brightness: 0.15,
      color: "#1b1b98",
      notes: [],
    };
    set((state) => ({ books: [...state.books, newBook] }));

    fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    })
      .then((res) => res.json() as Promise<CreateBookResponse>)
      .then((data) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === tempId
              ? {
                  ...b,
                  id: data.id,
                  position: data.position,
                  brightness: data.brightness,
                  color: data.color,
                }
              : b,
          ),
        }));
      })
      .catch(() => {
        set((state) => ({
          books: state.books.filter((b) => b.id !== tempId),
        }));
      });
  },

  setSelectedBook: (book) => set({ selectedBookId: book?.id ?? null }),

  deleteBook: (bookId) => {
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
      selectedBookId:
        state.selectedBookId === bookId ? null : state.selectedBookId,
    }));
    fetch(`${API_BASE}/${bookId}`, { method: "DELETE" });
  },

  updatePageProgress: (bookId, delta) => {
    const book = get().books.find((b) => b.id === bookId);

    if (!book) return;
    const newPage = Math.min(
      book.totalPages,
      Math.max(0, book.currentPage + delta),
    );
    const newStatus =
      newPage === 0
        ? "unread"
        : newPage === book.totalPages
          ? "completed"
          : "reading";
    const completedAt =
      newStatus === "completed" ? new Date().toISOString() : null;
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? { ...b, currentPage: newPage, status: newStatus, completedAt }
          : b,
      ),
    }));
    fetch(`${API_BASE}/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPage: newPage,
        status: newStatus,
        completedAt,
      }),
    })
      .then((res) => res.json() as Promise<UpdateBookResponse>)
      .then((data) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId
              ? { ...b, brightness: data.brightness, color: data.color }
              : b,
          ),
        }));
      });
  },

  setPageProgress: (bookId, page) => {
    const book = get().books.find((b) => b.id === bookId);

    if (!book) return;

    const newPage = Math.min(book.totalPages, Math.max(0, page));
    const newStatus =
      newPage === 0
        ? "unread"
        : newPage === book.totalPages
          ? "completed"
          : "reading";
    const completedAt =
      newStatus === "completed" ? new Date().toISOString() : null;
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId
          ? { ...b, currentPage: newPage, status: newStatus, completedAt }
          : b,
      ),
    }));
    fetch(`${API_BASE}/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPage: newPage,
        status: newStatus,
        completedAt,
      }),
    })
      .then((res) => res.json() as Promise<UpdateBookResponse>)
      .then((data) => {
        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId
              ? { ...b, brightness: data.brightness, color: data.color }
              : b,
          ),
        }));
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
              notes: [
                ...b.notes,
                { id: tempId, content, page, createdAt: now },
              ],
            }
          : b,
      ),
    }));
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
    fetch(`${API_BASE}/${bookId}/notes/${noteId}`, {
      method: "DELETE",
    });
  },
}));

export default useLibraryStore;
