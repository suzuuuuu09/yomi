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
      .mockResolvedValue(response({ ...baseBook, currentPage: 11 }));
    vi.stubGlobal("fetch", fetchMock);

    await useLibraryStore.getState().updatePageProgress("book-1", 1);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/books/book-1/progress",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ delta: 1 }),
      }),
    );
    expect(useLibraryStore.getState().books[0].currentPage).toBe(11);
  });

  it("does not let an older response overwrite a newer progress response", async () => {
    resetStore();
    const pending: Array<{
      resolve: (value: Response) => void;
    }> = [];
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          pending.push({ resolve });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = useLibraryStore.getState().updatePageProgress("book-1", 1);
    const second = useLibraryStore.getState().updatePageProgress("book-1", 1);

    pending[1].resolve(response({ ...baseBook, currentPage: 12 }));
    await second;
    pending[0].resolve(response({ ...baseBook, currentPage: 11 }));
    await first;

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
