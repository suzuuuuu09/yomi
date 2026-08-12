import { create } from "zustand";
import { getApiErrorMessage, requestJson } from "@/lib/api-client";
import { pageToStatus, resolveCompletedAt } from "@/server/lib/book-status";
import { computeConstellationLines } from "@/server/lib/star-formation";
import type {
  Book,
  BookStatus,
  ReadingLog,
  ReadingNote,
  ReadingStats,
} from "@/types/library";

const API_BASE = "/api/books";
const READING_LOG_API_BASE = "/api/reading-logs";
const MAX_PAGE = 1_000_000;

interface FetchBooksResponse {
  books: Book[];
  constellationLines: [string, string][];
}

interface ArchivedBooksResponse {
  books: Book[];
}

interface MutationBookResponse {
  ok?: boolean;
  book: Book;
}

interface CreateBookResponse extends MutationBookResponse {
  id: string;
  position: [number, number, number];
  brightness: number;
  color: string;
}

interface NoteResponse {
  id: string;
}

interface ReadingLogsResponse {
  logs: ReadingLog[];
}

interface SettingsResponse {
  readingTimezone: string | null;
}

interface LibraryState {
  books: Book[];
  archivedBooks: Book[];
  constellationLines: [string, string][];
  readingStats: ReadingStats;
  readingTimezone: string | null;
  readingLogsByBookId: Record<string, ReadingLog[]>;
  isLoading: boolean;
  lastError: string | null;
  selectedBookId: string | null;
  newlyAddedBookId: string | null;
  isBottomDockVisible: boolean;
  clearNewlyAdded: () => void;
  clearMutationError: () => void;
  fetchBooks: () => Promise<void>;
  fetchArchivedBooks: () => Promise<void>;
  fetchReadingStats: () => Promise<void>;
  fetchReadingLogs: (bookId: string) => Promise<void>;
  setReadingTimezone: (readingTimezone: string) => Promise<boolean>;
  addBook: (partial: Partial<Book>) => Promise<void>;
  updateBook: (bookId: string, updates: Partial<Book>) => Promise<void>;
  archiveBook: (bookId: string) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  restoreBook: (bookId: string) => Promise<void>;
  permanentlyDeleteBook: (bookId: string) => Promise<void>;
  setSelectedBook: (book: Book | null) => void;
  updatePageProgress: (bookId: string, delta: number) => Promise<void>;
  setPageProgress: (bookId: string, page: number) => Promise<void>;
  addNote: (
    bookId: string,
    content: string,
    page: number | null,
  ) => Promise<void>;
  deleteNote: (bookId: string, noteId: string) => Promise<void>;
  updateReadingLog: (
    bookId: string,
    date: string,
    pagesRead: number,
    readingDay?: number | null,
    readingTimezoneRevision?: number,
  ) => Promise<void>;
  deleteReadingLog: (
    bookId: string,
    date: string,
    readingDay?: number | null,
    readingTimezoneRevision?: number,
  ) => Promise<void>;
  setBottomDockVisible: (visible: boolean) => void;
}

const latestRevision = new Map<string, number>();

function nextRevision(key: string) {
  const revision = (latestRevision.get(key) ?? 0) + 1;
  latestRevision.set(key, revision);
  return revision;
}

function isLatest(key: string, revision: number) {
  return latestRevision.get(key) === revision;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function parseBook(value: unknown): Book {
  if (!isRecord(value)) throw new Error("book is not an object");
  const position = value.position;
  const notes = value.notes;
  const status = value.status;

  if (
    !isString(value.id) ||
    !isString(value.title) ||
    !isString(value.author) ||
    !isString(value.isbn) ||
    !isNumber(value.totalPages) ||
    !isNumber(value.currentPage) ||
    !["unread", "reading", "completed"].includes(String(status)) ||
    !isString(value.genre) ||
    !isString(value.coverUrl) ||
    !isString(value.registeredAt) ||
    (value.completedAt !== null && !isString(value.completedAt)) ||
    (value.archivedAt !== undefined &&
      value.archivedAt !== null &&
      !isString(value.archivedAt)) ||
    !Array.isArray(position) ||
    position.length !== 3 ||
    !position.every(isNumber) ||
    !isNumber(value.brightness) ||
    !isString(value.color) ||
    !Array.isArray(notes)
  ) {
    throw new Error("book response has an invalid shape");
  }

  const parsedNotes: ReadingNote[] = notes.map((note) => {
    if (
      !isRecord(note) ||
      !isString(note.id) ||
      !isString(note.content) ||
      (note.page !== null && !isNumber(note.page)) ||
      !isString(note.createdAt)
    ) {
      throw new Error("note response has an invalid shape");
    }
    return {
      id: note.id,
      content: note.content,
      page: note.page,
      createdAt: note.createdAt,
    };
  });

  return {
    id: value.id,
    title: value.title,
    author: value.author,
    isbn: value.isbn,
    totalPages: value.totalPages,
    currentPage: value.currentPage,
    status: status as BookStatus,
    genre: value.genre,
    coverUrl: value.coverUrl,
    registeredAt: value.registeredAt,
    completedAt: value.completedAt,
    archivedAt:
      value.archivedAt === undefined || value.archivedAt === null
        ? null
        : value.archivedAt,
    position: [position[0], position[1], position[2]],
    brightness: value.brightness,
    color: value.color,
    notes: parsedNotes,
  };
}

function parseFetchBooksResponse(value: unknown): FetchBooksResponse {
  if (!isRecord(value) || !Array.isArray(value.books)) {
    throw new Error("books response has an invalid shape");
  }

  const lines = value.constellationLines;
  if (
    !Array.isArray(lines) ||
    !lines.every(
      (line) =>
        Array.isArray(line) && line.length === 2 && line.every(isString),
    )
  ) {
    throw new Error("constellation response has an invalid shape");
  }

  return {
    books: value.books.map(parseBook),
    constellationLines: lines as [string, string][],
  };
}

function parseMutationBookResponse(value: unknown): MutationBookResponse {
  if (!isRecord(value) || !isRecord(value.book)) {
    throw new Error("mutation response has an invalid shape");
  }
  return {
    ok: typeof value.ok === "boolean" ? value.ok : undefined,
    book: parseBook(value.book),
  };
}

function parseCreateBookResponse(value: unknown): CreateBookResponse {
  if (!isRecord(value) || !isString(value.id)) {
    throw new Error("create response has an invalid shape");
  }
  const mutation = parseMutationBookResponse(value);
  if (
    !Array.isArray(value.position) ||
    value.position.length !== 3 ||
    !value.position.every(isNumber) ||
    !isNumber(value.brightness) ||
    !isString(value.color)
  ) {
    throw new Error("create response has an invalid shape");
  }
  return {
    ...mutation,
    id: value.id,
    position: [value.position[0], value.position[1], value.position[2]],
    brightness: value.brightness,
    color: value.color,
  };
}

function parseArchivedBooksResponse(value: unknown): ArchivedBooksResponse {
  if (!isRecord(value) || !Array.isArray(value.books)) {
    throw new Error("archived books response has an invalid shape");
  }
  return { books: value.books.map(parseBook) };
}

function parseReadingStats(value: unknown): ReadingStats {
  if (
    !isRecord(value) ||
    !Array.isArray(value.days) ||
    !isNumber(value.streak) ||
    !Number.isInteger(value.streak) ||
    value.streak < 0 ||
    (value.readingTimezone !== null &&
      value.readingTimezone !== undefined &&
      !isString(value.readingTimezone))
  ) {
    throw new Error("reading stats response has an invalid shape");
  }
  const days = value.days.map((day) => {
    if (
      !isRecord(day) ||
      !isString(day.date) ||
      !isNumber(day.pagesRead) ||
      day.pagesRead < 0
    ) {
      throw new Error("reading stats day has an invalid shape");
    }
    if (
      day.readingDay !== undefined &&
      (!isNumber(day.readingDay) || !Number.isInteger(day.readingDay))
    ) {
      throw new Error("reading stats day has an invalid day");
    }
    return {
      date: day.date,
      pagesRead: day.pagesRead,
      readingDay: day.readingDay as number | undefined,
    };
  });
  return {
    days,
    streak: value.streak,
    readingTimezone:
      value.readingTimezone === undefined ? null : value.readingTimezone,
  };
}

function parseReadingLogsResponse(value: unknown): ReadingLogsResponse {
  if (!isRecord(value) || !Array.isArray(value.logs)) {
    throw new Error("reading logs response has an invalid shape");
  }
  const logs = value.logs.map((log) => {
    if (
      !isRecord(log) ||
      !isString(log.id) ||
      !isString(log.date) ||
      !isNumber(log.pagesRead) ||
      log.pagesRead < 1
    ) {
      throw new Error("reading log has an invalid shape");
    }
    if (
      log.readingDay !== undefined &&
      log.readingDay !== null &&
      (!isNumber(log.readingDay) || !Number.isInteger(log.readingDay))
    ) {
      throw new Error("reading log has an invalid day");
    }
    if (
      log.readingTimezoneRevision !== undefined &&
      (!isNumber(log.readingTimezoneRevision) ||
        !Number.isSafeInteger(log.readingTimezoneRevision) ||
        log.readingTimezoneRevision < 0)
    ) {
      throw new Error("reading log has an invalid timezone revision");
    }
    return {
      id: log.id,
      date: log.date,
      pagesRead: log.pagesRead,
      readingDay: log.readingDay as number | null | undefined,
      readingTimezoneRevision: log.readingTimezoneRevision as
        | number
        | undefined,
    };
  });
  return { logs };
}

function parseSettingsResponse(value: unknown): SettingsResponse {
  if (
    !isRecord(value) ||
    (value.readingTimezone !== null &&
      value.readingTimezone !== undefined &&
      !isString(value.readingTimezone))
  ) {
    throw new Error("settings response has an invalid shape");
  }
  return {
    readingTimezone:
      value.readingTimezone === undefined ? null : value.readingTimezone,
  };
}

function parseNoteResponse(value: unknown): NoteResponse {
  if (!isRecord(value) || !isString(value.id)) {
    throw new Error("note response has an invalid shape");
  }
  return { id: value.id };
}

function toStarInfos(books: Book[]) {
  return books.map((book) => ({
    id: book.id,
    status: book.status,
    genre: book.genre,
    positionX: book.position[0],
    positionY: book.position[1],
    positionZ: book.position[2],
  }));
}

function withLines(books: Book[]) {
  return {
    books,
    constellationLines: computeConstellationLines(toStarInfos(books)),
  };
}

function replaceBook(books: Book[], replacement: Book) {
  return books.map((book) => (book.id === replacement.id ? replacement : book));
}

function clampPage(page: number, totalPages: number) {
  const normalized = Math.min(MAX_PAGE, Math.max(0, Math.trunc(page)));
  return totalPages > 0 ? Math.min(totalPages, normalized) : normalized;
}

function progressBook(book: Book, page: number): Book {
  const currentPage = clampPage(page, book.totalPages);
  const status = pageToStatus(currentPage, book.totalPages);
  const completedAt = resolveCompletedAt(
    status,
    book.status,
    new Date().toISOString(),
    book.completedAt,
  );
  return { ...book, currentPage, status, completedAt };
}

function toUpdatePayload(updates: Partial<Book>) {
  return {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.author !== undefined ? { author: updates.author } : {}),
    ...(updates.isbn !== undefined ? { isbn: updates.isbn } : {}),
    ...(updates.totalPages !== undefined
      ? { totalPages: updates.totalPages }
      : {}),
    ...(updates.genre !== undefined ? { genre: updates.genre } : {}),
    ...(updates.coverUrl !== undefined ? { coverUrl: updates.coverUrl } : {}),
  };
}

function restoreBook(books: Book[], book: Book, index: number) {
  const withoutBook = books.filter((item) => item.id !== book.id);
  withoutBook.splice(Math.min(index, withoutBook.length), 0, book);
  return withoutBook;
}

type ProgressRequest =
  | { kind: "delta"; delta: number }
  | { kind: "page"; page: number };

const useLibraryStore = create<LibraryState>((set, get) => {
  const progressQueues = new Map<string, Promise<void>>();

  const mutateProgress = async (bookId: string, request: ProgressRequest) => {
    const previous = progressQueues.get(bookId) ?? Promise.resolve();
    const operation = previous
      .catch(() => undefined)
      .then(async () => {
        const book = get().books.find((item) => item.id === bookId);
        if (!book) return;

        const previousBook = book;
        const targetPage =
          request.kind === "delta"
            ? book.currentPage + request.delta
            : request.page;
        const revision = nextRevision(bookId);
        const optimistic = progressBook(book, targetPage);

        set((state) => ({
          ...withLines(replaceBook(state.books, optimistic)),
          lastError: null,
        }));

        try {
          const progressBody =
            request.kind === "delta"
              ? { delta: request.delta }
              : { page: optimistic.currentPage };
          const body = {
            ...progressBody,
            readingTimezone: get().readingTimezone ?? browserTimeZone(),
          };
          const data = await requestJson(
            `${API_BASE}/${bookId}/progress`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
            parseMutationBookResponse,
          );
          if (!isLatest(bookId, revision)) return;
          set((state) => ({
            ...withLines(replaceBook(state.books, data.book)),
            lastError: null,
          }));
          void get().fetchReadingStats();
          if (get().readingLogsByBookId[bookId]) {
            void get().fetchReadingLogs(bookId);
          }
        } catch (error) {
          if (!isLatest(bookId, revision)) return;
          set((state) => ({
            ...withLines(replaceBook(state.books, previousBook)),
            lastError: getApiErrorMessage(
              error,
              "進捗を更新できませんでした。",
            ),
          }));
        }
      });
    progressQueues.set(bookId, operation);
    try {
      await operation;
    } finally {
      if (progressQueues.get(bookId) === operation) {
        progressQueues.delete(bookId);
      }
    }
  };

  return {
    books: [],
    archivedBooks: [],
    constellationLines: [],
    readingStats: { days: [], streak: 0, readingTimezone: null },
    readingTimezone: null,
    readingLogsByBookId: {},
    isLoading: false,
    lastError: null,
    selectedBookId: null,
    newlyAddedBookId: null,

    clearNewlyAdded: () => set({ newlyAddedBookId: null }),
    clearMutationError: () => set({ lastError: null }),

    fetchBooks: async () => {
      set({ isLoading: true });
      try {
        const data = await requestJson(
          API_BASE,
          undefined,
          parseFetchBooksResponse,
        );
        set({ ...data, isLoading: false, lastError: null });
        try {
          const settings = await requestJson(
            `${READING_LOG_API_BASE}/settings`,
            undefined,
            parseSettingsResponse,
          );
          let readingTimezone = settings.readingTimezone;
          if (!readingTimezone) {
            const detected = browserTimeZone();
            const saved = await requestJson(
              `${READING_LOG_API_BASE}/settings`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ readingTimezone: detected }),
              },
              parseSettingsResponse,
            );
            readingTimezone = saved.readingTimezone;
          }
          set({ readingTimezone });
        } catch {
          // 読書設定が未取得でも本一覧は表示できるようにする。
        }
        void get().fetchReadingStats();
      } catch (error) {
        set({
          isLoading: false,
          lastError: getApiErrorMessage(
            error,
            "本の一覧を取得できませんでした。",
          ),
        });
      }
    },

    fetchArchivedBooks: async () => {
      try {
        const data = await requestJson(
          `${API_BASE}/archived`,
          undefined,
          parseArchivedBooksResponse,
        );
        set({ archivedBooks: data.books });
      } catch (error) {
        set({
          lastError: getApiErrorMessage(
            error,
            "アーカイブ済みの本を取得できませんでした。",
          ),
        });
      }
    },

    fetchReadingStats: async () => {
      try {
        const data = await requestJson(
          READING_LOG_API_BASE,
          undefined,
          parseReadingStats,
        );
        set({
          readingStats: data,
          readingTimezone: data.readingTimezone ?? get().readingTimezone,
        });
      } catch (error) {
        set({
          lastError: getApiErrorMessage(
            error,
            "読書統計を取得できませんでした。",
          ),
        });
      }
    },

    fetchReadingLogs: async (bookId) => {
      try {
        const data = await requestJson(
          `${READING_LOG_API_BASE}/${encodeURIComponent(bookId)}`,
          undefined,
          parseReadingLogsResponse,
        );
        set((state) => ({
          readingLogsByBookId: {
            ...state.readingLogsByBookId,
            [bookId]: data.logs,
          },
        }));
      } catch (error) {
        set({
          lastError: getApiErrorMessage(
            error,
            "読書ログを取得できませんでした。",
          ),
        });
      }
    },

    setReadingTimezone: async (readingTimezone) => {
      try {
        const data = await requestJson(
          `${READING_LOG_API_BASE}/settings`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ readingTimezone }),
          },
          parseSettingsResponse,
        );
        set({ readingTimezone: data.readingTimezone, lastError: null });
        await get().fetchReadingStats();
        return true;
      } catch (error) {
        set({
          lastError: getApiErrorMessage(
            error,
            "読書タイムゾーンを更新できませんでした。",
          ),
        });
        return false;
      }
    },

    addBook: async (partial) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newBook: Book = {
        id: tempId,
        title: partial.title ?? "",
        author: partial.author ?? "",
        isbn: partial.isbn ?? "",
        totalPages: partial.totalPages ?? 0,
        currentPage: partial.currentPage ?? 0,
        status: partial.status ?? "unread",
        genre: partial.genre ?? "",
        coverUrl: partial.coverUrl ?? "",
        registeredAt: new Date().toISOString(),
        completedAt: null,
        archivedAt: null,
        position: [0, 0, 0],
        brightness: 0.15,
        color: "#1b1b98",
        notes: [],
      };
      set((state) => ({
        ...withLines([...state.books, newBook]),
        newlyAddedBookId: tempId,
        lastError: null,
      }));

      try {
        const data = await requestJson(
          API_BASE,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(partial),
          },
          parseCreateBookResponse,
        );
        set((state) => {
          const updatedBooks = state.books.map((book) =>
            book.id === tempId ? data.book : book,
          );
          return { ...withLines(updatedBooks), newlyAddedBookId: data.id };
        });
      } catch (error) {
        set((state) => ({
          ...withLines(state.books.filter((book) => book.id !== tempId)),
          newlyAddedBookId: null,
          lastError: getApiErrorMessage(error, "本を登録できませんでした。"),
        }));
      }
    },

    updateBook: async (bookId, updates) => {
      const previous = get().books.find((book) => book.id === bookId);
      if (!previous) return;
      const revision = nextRevision(bookId);
      const payload = toUpdatePayload(updates);

      set((state) => ({
        ...withLines(
          state.books.map((book) =>
            book.id === bookId ? { ...book, ...payload } : book,
          ),
        ),
        lastError: null,
      }));

      try {
        const data = await requestJson(
          `${API_BASE}/${bookId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          parseMutationBookResponse,
        );
        if (!isLatest(bookId, revision)) return;
        set((state) => ({
          ...withLines(replaceBook(state.books, data.book)),
          lastError: null,
        }));
      } catch (error) {
        if (!isLatest(bookId, revision)) return;
        set((state) => ({
          ...withLines(replaceBook(state.books, previous)),
          lastError: getApiErrorMessage(error, "本を更新できませんでした。"),
        }));
      }
    },

    setSelectedBook: (book) => set({ selectedBookId: book?.id ?? null }),

    archiveBook: async (bookId) => {
      const previousIndex = get().books.findIndex((book) => book.id === bookId);
      const previous = get().books[previousIndex];
      if (!previous) return;
      const revision = nextRevision(bookId);
      const archived = { ...previous, archivedAt: new Date().toISOString() };

      set((state) => ({
        ...withLines(state.books.filter((book) => book.id !== bookId)),
        archivedBooks: [
          ...state.archivedBooks.filter((book) => book.id !== bookId),
          archived,
        ],
        selectedBookId:
          state.selectedBookId === bookId ? null : state.selectedBookId,
        lastError: null,
      }));

      try {
        await requestJson(`${API_BASE}/${bookId}/archive`, { method: "POST" });
      } catch (error) {
        if (!isLatest(bookId, revision)) return;
        set((state) => ({
          ...withLines(restoreBook(state.books, previous, previousIndex)),
          archivedBooks: state.archivedBooks.filter(
            (book) => book.id !== bookId,
          ),
          lastError: getApiErrorMessage(
            error,
            "本をアーカイブできませんでした。",
          ),
        }));
      }
    },

    deleteBook: async (bookId) => {
      await get().archiveBook(bookId);
    },

    restoreBook: async (bookId) => {
      const archived = get().archivedBooks.find((book) => book.id === bookId);
      if (!archived) return;
      const revision = nextRevision(bookId);
      try {
        const data = await requestJson(
          `${API_BASE}/${bookId}/restore`,
          { method: "POST" },
          parseMutationBookResponse,
        );
        if (!isLatest(bookId, revision)) return;
        set((state) => ({
          ...withLines([
            ...state.books.filter((book) => book.id !== bookId),
            data.book,
          ]),
          archivedBooks: state.archivedBooks.filter(
            (book) => book.id !== bookId,
          ),
          lastError: null,
        }));
      } catch (error) {
        if (!isLatest(bookId, revision)) return;
        set({
          lastError: getApiErrorMessage(error, "本を復元できませんでした。"),
        });
      }
    },

    permanentlyDeleteBook: async (bookId) => {
      const activeIndex = get().books.findIndex((book) => book.id === bookId);
      const active = get().books[activeIndex];
      const archived = get().archivedBooks.find((book) => book.id === bookId);
      const previous = active ?? archived;
      if (!previous) return;
      const revision = nextRevision(bookId);
      set((state) => ({
        ...withLines(state.books.filter((book) => book.id !== bookId)),
        archivedBooks: state.archivedBooks.filter((book) => book.id !== bookId),
        selectedBookId:
          state.selectedBookId === bookId ? null : state.selectedBookId,
        lastError: null,
      }));
      try {
        await requestJson(`${API_BASE}/${bookId}/permanent`, {
          method: "DELETE",
        });
        await get().fetchReadingStats();
      } catch (error) {
        if (!isLatest(bookId, revision)) return;
        set((state) => ({
          ...withLines(
            active
              ? restoreBook(state.books, active, activeIndex)
              : state.books,
          ),
          archivedBooks: archived
            ? [...state.archivedBooks, archived]
            : state.archivedBooks,
          lastError: getApiErrorMessage(
            error,
            "本を完全削除できませんでした。",
          ),
        }));
      }
    },

    updatePageProgress: async (bookId, delta) => {
      if (!Number.isInteger(delta)) return;
      await mutateProgress(bookId, { kind: "delta", delta });
    },

    setPageProgress: async (bookId, page) => {
      if (!Number.isInteger(page)) return;
      await mutateProgress(bookId, { kind: "page", page });
    },

    addNote: async (bookId, content, page) => {
      const tempId = `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();
      const revision = nextRevision(tempId);
      const note: ReadingNote = { id: tempId, content, page, createdAt: now };

      set((state) => ({
        books: state.books.map((book) =>
          book.id === bookId ? { ...book, notes: [...book.notes, note] } : book,
        ),
        lastError: null,
      }));

      try {
        const data = await requestJson(
          `${API_BASE}/${bookId}/notes`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, page }),
          },
          parseNoteResponse,
        );
        if (!isLatest(tempId, revision)) return;
        set((state) => ({
          books: state.books.map((book) =>
            book.id === bookId
              ? {
                  ...book,
                  notes: book.notes.map((item) =>
                    item.id === tempId ? { ...item, id: data.id } : item,
                  ),
                }
              : book,
          ),
          lastError: null,
        }));
      } catch (error) {
        if (!isLatest(tempId, revision)) return;
        set((state) => ({
          books: state.books.map((book) =>
            book.id === bookId
              ? {
                  ...book,
                  notes: book.notes.filter((item) => item.id !== tempId),
                }
              : book,
          ),
          lastError: getApiErrorMessage(
            error,
            "ノートを追加できませんでした。",
          ),
        }));
      }
    },

    deleteNote: async (bookId, noteId) => {
      const book = get().books.find((item) => item.id === bookId);
      const noteIndex =
        book?.notes.findIndex((note) => note.id === noteId) ?? -1;
      const previous = book?.notes[noteIndex];
      if (!book || !previous || noteIndex < 0) return;
      const revision = nextRevision(noteId);

      set((state) => ({
        books: state.books.map((item) =>
          item.id === bookId
            ? {
                ...item,
                notes: item.notes.filter((note) => note.id !== noteId),
              }
            : item,
        ),
        lastError: null,
      }));

      try {
        await requestJson(`${API_BASE}/${bookId}/notes/${noteId}`, {
          method: "DELETE",
        });
      } catch (error) {
        if (!isLatest(noteId, revision)) return;
        set((state) => ({
          books: state.books.map((item) => {
            if (item.id !== bookId) return item;
            const notes = [...item.notes];
            notes.splice(Math.min(noteIndex, notes.length), 0, previous);
            return { ...item, notes };
          }),
          lastError: getApiErrorMessage(
            error,
            "ノートを削除できませんでした。",
          ),
        }));
      }
    },

    updateReadingLog: async (
      bookId,
      date,
      pagesRead,
      readingDay,
      readingTimezoneRevision,
    ) => {
      if (!Number.isInteger(pagesRead) || pagesRead < 0) return;
      try {
        await requestJson(
          `${READING_LOG_API_BASE}/${encodeURIComponent(bookId)}/${encodeURIComponent(date)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pagesRead,
              readingDay,
              readingTimezoneRevision,
            }),
          },
        );
        await Promise.all([
          get().fetchReadingLogs(bookId),
          get().fetchReadingStats(),
        ]);
        set({ lastError: null });
      } catch (error) {
        set({
          lastError: getApiErrorMessage(
            error,
            "読書ログを更新できませんでした。",
          ),
        });
      }
    },

    deleteReadingLog: async (
      bookId,
      date,
      readingDay,
      readingTimezoneRevision,
    ) => {
      try {
        const query = new URLSearchParams();
        if (readingDay !== undefined && readingDay !== null) {
          query.set("readingDay", String(readingDay));
        }
        if (readingTimezoneRevision !== undefined) {
          query.set("readingTimezoneRevision", String(readingTimezoneRevision));
        }
        const suffix = query.toString() ? `?${query.toString()}` : "";
        await requestJson(
          `${READING_LOG_API_BASE}/${encodeURIComponent(bookId)}/${encodeURIComponent(date)}${suffix}`,
          { method: "DELETE" },
        );
        await Promise.all([
          get().fetchReadingLogs(bookId),
          get().fetchReadingStats(),
        ]);
        set({ lastError: null });
      } catch (error) {
        set({
          lastError: getApiErrorMessage(
            error,
            "読書ログを削除できませんでした。",
          ),
        });
      }
    },

    isBottomDockVisible: false,
    setBottomDockVisible: (visible) => set({ isBottomDockVisible: visible }),
  };
});

export default useLibraryStore;
