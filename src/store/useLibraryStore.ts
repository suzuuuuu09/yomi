import { create } from "zustand";
import { pageToStatus, resolveCompletedAt } from "@/server/lib/book-status";
import { computeConstellationLines } from "@/server/lib/star-formation";
import type { Book, BookStatus } from "@/types/library";

const API_BASE = "/api/books";

interface LibraryState {
  books: Book[];
  constellationLines: [string, string][];
  isLoading: boolean;
  selectedBookId: string | null;
  newlyAddedBookId: string | null;
  clearNewlyAdded: () => void;
  fetchBooks: () => Promise<void>;
  addBook: (partial: Partial<Book>) => void;
  updateBook: (bookId: string, updates: Partial<Book>) => void;
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
  status: BookStatus;
  completedAt: string | null;
}

// booksの配列から星座線計算用の入力に変換
function toStarInfos(bs: Book[]) {
  return bs.map((b) => ({
    id: b.id,
    status: b.status,
    genre: b.genre,
    positionX: b.position[0],
    positionY: b.position[1],
    positionZ: b.position[2],
  }));
}

// booksを更新して星座線も同時に再計算する
function withLines(books: Book[]) {
  return {
    books,
    constellationLines: computeConstellationLines(toStarInfos(books)),
  };
}

const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  constellationLines: [],
  isLoading: false,
  selectedBookId: null,
  newlyAddedBookId: null,
  clearNewlyAdded: () => set({ newlyAddedBookId: null }),

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
    set((state) => ({
      ...withLines([...state.books, newBook]),
      newlyAddedBookId: tempId,
    }));

    fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    })
      .then((res) => res.json() as Promise<CreateBookResponse>)
      .then((data) => {
        set((state) => {
          const updatedBooks = state.books.map((b) =>
            b.id === tempId
              ? {
                  ...b,
                  id: data.id,
                  position: data.position,
                  brightness: data.brightness,
                  color: data.color,
                }
              : b,
          );
          return { ...withLines(updatedBooks), newlyAddedBookId: data.id };
        });
      })
      .catch(() => {
        set((state) => ({
          ...withLines(state.books.filter((b) => b.id !== tempId)),
          newlyAddedBookId: null,
        }));
      });
  },

  updateBook: (bookId, updates) => {
    const book = get().books.find((b) => b.id === bookId);
    if (!book) return;

    // 楽観的更新
    set((state) => {
      const updatedBooks = state.books.map((b) =>
        b.id === bookId ? { ...b, ...updates } : b,
      );
      return withLines(updatedBooks);
    });

    fetch(`${API_BASE}/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
        return res.json() as Promise<UpdateBookResponse>;
      })
      .then((data) => {
        set((state) => {
          const updatedBooks = state.books.map((b) =>
            b.id === bookId
              ? {
                  ...b,
                  brightness: data.brightness,
                  color: data.color,
                  status: data.status,
                  completedAt: data.completedAt,
                }
              : b,
          );
          return withLines(updatedBooks);
        });
      })
      .catch(() => {
        // 失敗時はロールバック
        set((state) => {
          const updatedBooks = state.books.map((b) =>
            b.id === bookId ? book : b,
          );
          return withLines(updatedBooks);
        });
      });
  },

  setSelectedBook: (book) => set({ selectedBookId: book?.id ?? null }),

  deleteBook: (bookId) => {
    set((state) => ({
      ...withLines(state.books.filter((b) => b.id !== bookId)),
      selectedBookId:
        state.selectedBookId === bookId ? null : state.selectedBookId,
    }));
    fetch(`${API_BASE}/${bookId}`, { method: "DELETE" });
  },

  updatePageProgress: (bookId, delta) => {
    const book = get().books.find((b) => b.id === bookId);

    if (!book) return;
    const prevPage = book.currentPage;
    const prevStatus = book.status;
    const prevCompletedAt = book.completedAt;

    const newPage = Math.min(
      book.totalPages,
      Math.max(0, book.currentPage + delta),
    );
    const newStatus = pageToStatus(newPage, book.totalPages);
    const now = new Date().toISOString();
    const newCompletedAt = resolveCompletedAt(
      newStatus,
      book.status,
      now,
      book.completedAt,
    );

    set((state) => {
      const updatedBooks = state.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              currentPage: newPage,
              status: newStatus,
              completedAt: newCompletedAt,
            }
          : b,
      );
      return withLines(updatedBooks);
    });
    fetch(`${API_BASE}/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPage: newPage }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
        return res.json() as Promise<UpdateBookResponse>;
      })
      .then((data) => {
        set((state) => {
          const updatedBooks = state.books.map((b) =>
            b.id === bookId
              ? {
                  ...b,
                  brightness: data.brightness,
                  color: data.color,
                  status: data.status,
                  completedAt: data.completedAt,
                }
              : b,
          );
          return withLines(updatedBooks);
        });
      })
      .catch(() => {
        // API失敗時に更新をロールバック
        set((state) => {
          const updatedBooks = state.books.map((b) =>
            b.id === bookId
              ? {
                  ...b,
                  currentPage: prevPage,
                  status: prevStatus,
                  completedAt: prevCompletedAt,
                }
              : b,
          );
          return withLines(updatedBooks);
        });
      });
  },

  setPageProgress: (bookId, page) => {
    const book = get().books.find((b) => b.id === bookId);

    if (!book) return;

    const prevPage = book.currentPage;
    const prevStatus = book.status;
    const prevCompletedAt = book.completedAt;

    const newPage = Math.min(book.totalPages, Math.max(0, page));
    const newStatus = pageToStatus(newPage, book.totalPages);
    const now = new Date().toISOString();
    const newCompletedAt = resolveCompletedAt(
      newStatus,
      book.status,
      now,
      book.completedAt,
    );

    set((state) => {
      const updatedBooks = state.books.map((b) =>
        b.id === bookId
          ? {
              ...b,
              currentPage: newPage,
              status: newStatus,
              completedAt: newCompletedAt,
            }
          : b,
      );
      return withLines(updatedBooks);
    });
    fetch(`${API_BASE}/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPage: newPage }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
        return res.json() as Promise<UpdateBookResponse>;
      })
      .then((data) => {
        set((state) => {
          const updatedBooks = state.books.map((b) =>
            b.id === bookId
              ? {
                  ...b,
                  brightness: data.brightness,
                  color: data.color,
                  status: data.status,
                  completedAt: data.completedAt,
                }
              : b,
          );
          return withLines(updatedBooks);
        });
      })
      .catch(() => {
        set((state) => {
          const updatedBooks = state.books.map((b) =>
            b.id === bookId
              ? {
                  ...b,
                  currentPage: prevPage,
                  status: prevStatus,
                  completedAt: prevCompletedAt,
                }
              : b,
          );
          return withLines(updatedBooks);
        });
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
