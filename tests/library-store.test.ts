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
