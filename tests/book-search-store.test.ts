import { afterEach, describe, expect, it, vi } from "vitest";
import { searchBooks, searchByISBN } from "@/lib/api";
import { useBookSearchStore } from "@/store/useBookSearchStore";

vi.mock("@/lib/api", () => ({
  searchBooks: vi.fn(),
  searchByISBN: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  useBookSearchStore.getState().reset();
});

describe("useBookSearchStore", () => {
  it("clears the searching state and exposes an error when the request fails", async () => {
    vi.mocked(searchBooks).mockRejectedValue(new Error("offline"));
    useBookSearchStore.getState().setQuery("TypeScript");

    await useBookSearchStore.getState().fetchPage(0);

    expect(useBookSearchStore.getState().isSearching).toBe(false);
    expect(useBookSearchStore.getState().error).toBe("検索に失敗しました。");
  });

  it("keeps a successful result and clears an earlier error", async () => {
    vi.mocked(searchByISBN).mockResolvedValue({
      totalItems: 1,
      books: [],
    });
    useBookSearchStore.getState().setMode("isbn");
    useBookSearchStore.getState().setQuery("9784000000000");

    await useBookSearchStore.getState().fetchPage(0);

    expect(useBookSearchStore.getState().isSearching).toBe(false);
    expect(useBookSearchStore.getState().error).toBeNull();
    expect(useBookSearchStore.getState().totalItems).toBe(1);
  });

  it("ignores a request that finishes after the search was reset", async () => {
    let resolveSearch!: (value: { totalItems: number; books: [] }) => void;
    vi.mocked(searchBooks).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );
    useBookSearchStore.getState().setQuery("TypeScript");

    const pending = useBookSearchStore.getState().fetchPage(0);
    useBookSearchStore.getState().reset();
    resolveSearch({ totalItems: 1, books: [] });
    await pending;

    expect(useBookSearchStore.getState().hasSearched).toBe(false);
    expect(useBookSearchStore.getState().searchResults).toEqual([]);
    expect(useBookSearchStore.getState().isSearching).toBe(false);
  });

  it("ignores a request after the query changes", async () => {
    let resolveSearch!: (value: { totalItems: number; books: [] }) => void;
    vi.mocked(searchBooks).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );
    useBookSearchStore.getState().setQuery("TypeScript");

    const pending = useBookSearchStore.getState().fetchPage(0);
    useBookSearchStore.getState().setQuery("Zustand");
    resolveSearch({ totalItems: 1, books: [] });
    await pending;

    expect(useBookSearchStore.getState().query).toBe("Zustand");
    expect(useBookSearchStore.getState().searchResults).toEqual([]);
    expect(useBookSearchStore.getState().isSearching).toBe(false);
  });
});
