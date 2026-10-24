import { afterEach, describe, expect, it, vi } from "vitest";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book } from "@/types/library";

const baseBook: Book = {
  id: "book-1",
  title: "テスト本",
  author: "著者",
  isbn: "",
  totalPages: 100,
  currentPage: 10,
  status: "reading",
  genre: "技術",
  coverUrl: "",
  registeredAt: "2026-01-01T00:00:00.000Z",
  completedAt: null,
  archivedAt: null,
  position: [0, 0, 0],
  brightness: 0.5,
  color: "#ffffff",
  notes: [],
};

function response(book: Book) {
  return new Response(JSON.stringify({ ok: true, book }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function statsResponse() {
  return new Response(
    JSON.stringify({
      days: [],
      streak: 0,
      readingTimezone: "UTC",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function resetStore() {
  useLibraryStore.setState({
    books: [structuredClone(baseBook)],
    constellationLines: [],
    lastError: null,
    selectedBookId: null,
    newlyAddedBookId: null,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  resetStore();
});

describe("useLibraryStore progress actions", () => {
  it("uses the atomic progress endpoint and applies the canonical response", async () => {
    resetStore();
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL) =>
        String(input) === "/api/reading-logs"
          ? statsResponse()
          : response({ ...baseBook, currentPage: 11 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await useLibraryStore.getState().updatePageProgress("book-1", 1);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/books/book-1/progress",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      delta: 1,
      readingTimezone: expect.any(String),
    });
    expect(useLibraryStore.getState().books[0].currentPage).toBe(11);
  });

  it("serializes progress requests for the same book", async () => {
    resetStore();
    const pending: Array<{
      resolve: (value: Response) => void;
    }> = [];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === "/api/reading-logs") return statsResponse();
      return new Promise<Response>((resolve) => {
        pending.push({ resolve });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = useLibraryStore.getState().updatePageProgress("book-1", 1);
    const second = useLibraryStore.getState().updatePageProgress("book-1", 1);

    for (let attempt = 0; attempt < 5 && pending.length < 1; attempt += 1) {
      await Promise.resolve();
    }
    expect(pending).toHaveLength(1);
    pending[0].resolve(response({ ...baseBook, currentPage: 11 }));
    await first;
    for (let attempt = 0; attempt < 5 && pending.length < 2; attempt += 1) {
      await Promise.resolve();
    }
    expect(pending).toHaveLength(2);
    pending[1].resolve(response({ ...baseBook, currentPage: 12 }));
    await second;

    expect(useLibraryStore.getState().books[0].currentPage).toBe(12);
  });

  it("rolls back a failed mutation and exposes a local error", async () => {
    resetStore();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await useLibraryStore.getState().updatePageProgress("book-1", 1);

    expect(useLibraryStore.getState().books[0].currentPage).toBe(10);
    expect(useLibraryStore.getState().lastError).toBe(
      "進捗を更新できませんでした。",
    );
  });
});

describe("library persistence", () => {
  it("does not expose a temporary book before creation succeeds", async () => {
    resetStore();
    let finish!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const operation = useLibraryStore.getState().addBook({ title: "新しい本" });
    expect(useLibraryStore.getState().books.map((book) => book.id)).toEqual([
      "book-1",
    ]);
    finish(response({ ...baseBook, id: "created-book" }));
    expect(await operation).toBe(true);
    expect(useLibraryStore.getState().books.map((book) => book.id)).toEqual([
      "book-1",
      "created-book",
    ]);
  });
});

it("keeps failed note creation out of the book and reports failure", async () => {
  resetStore();
  let finish!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const operation = useLibraryStore.getState().addNote("book-1", "メモ", null);
  expect(useLibraryStore.getState().books[0].notes).toEqual([]);
  finish(
    new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "保存できません" },
      }),
      { status: 500 },
    ),
  );
  expect(await operation).toBe(false);
  expect(useLibraryStore.getState().books[0].notes).toEqual([]);
});

it("ignores a stats response older than the last completed refresh", async () => {
  const pending: Array<(value: Response) => void> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))),
  );
  const older = useLibraryStore.getState().fetchReadingStats();
  const newer = useLibraryStore.getState().fetchReadingStats();
  const stats = (pagesRead: number) =>
    new Response(
      JSON.stringify({
        days: [{ date: "2026-10-24", pagesRead }],
        streak: 1,
        readingTimezone: "UTC",
      }),
    );
  pending[1](stats(2));
  await newer;
  pending[0](stats(1));
  await older;
  expect(useLibraryStore.getState().readingStats.days[0].pagesRead).toBe(2);
});

it("keeps a refresh failure visible after a successful log correction", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(
        init?.method === "PUT"
          ? new Response(JSON.stringify({ ok: true }))
          : new Response(
              JSON.stringify({
                error: { code: "INTERNAL_ERROR", message: "再取得に失敗" },
              }),
              { status: 500 },
            ),
      ),
    ),
  );
  await useLibraryStore.getState().updateReadingLog("book-1", "2026-10-24", 12);
  expect(useLibraryStore.getState().lastError).toBe("再取得に失敗");
});

it("refreshes a book snapshot that arrived after a local creation", async () => {
  resetStore();
  let finishList!: (value: Response) => void;
  let listRequests = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/books" && init?.method === "POST")
        return response({ ...baseBook, id: "created-book" });
      if (String(input) === "/api/books") {
        listRequests += 1;
        if (listRequests === 1)
          return new Promise<Response>((resolve) => {
            finishList = resolve;
          });
        return new Response(
          JSON.stringify({
            books: [baseBook, { ...baseBook, id: "created-book" }],
            constellationLines: [],
          }),
        );
      }
      if (String(input).endsWith("/settings"))
        return new Response(JSON.stringify({ readingTimezone: "UTC" }));
      return statsResponse();
    }),
  );
  const initialFetch = useLibraryStore.getState().fetchBooks();
  await useLibraryStore.getState().addBook({ title: "新しい本" });
  finishList(
    new Response(JSON.stringify({ books: [baseBook], constellationLines: [] })),
  );
  await initialFetch;
  expect(useLibraryStore.getState().books.map((book) => book.id)).toEqual([
    "book-1",
    "created-book",
  ]);
});

it("keeps a newly saved note when an older progress response arrives", async () => {
  resetStore();
  let finishProgress!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/progress"))
        return new Promise<Response>((resolve) => {
          finishProgress = resolve;
        });
      if (String(input).endsWith("/notes"))
        return new Response(JSON.stringify({ id: "saved-note" }));
      return statsResponse();
    }),
  );
  const progress = useLibraryStore.getState().updatePageProgress("book-1", 1);
  for (let tick = 0; tick < 5 && !finishProgress; tick += 1)
    await Promise.resolve();
  await useLibraryStore.getState().addNote("book-1", "残すメモ", null);
  finishProgress(response({ ...baseBook, currentPage: 11 }));
  await progress;
  expect(useLibraryStore.getState().books[0].notes).toMatchObject([
    { id: "saved-note", content: "残すメモ" },
  ]);
});
