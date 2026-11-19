import { beforeEach, describe, expect, it } from "vitest";
import { filterBooks, getGenreOptions } from "@/hooks/useFilteredBooks";
import useLibraryFilterStore from "@/store/useLibraryFilterStore";
import type { Book } from "@/types/library";

function book(overrides: Partial<Book> & Pick<Book, "id">): Book {
  return {
    title: "テスト本",
    author: "著者",
    isbn: "",
    totalPages: 100,
    currentPage: 10,
    status: "reading",
    genre: "literature",
    coverUrl: "",
    registeredAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    position: [0, 0, 0],
    brightness: 0.5,
    color: "#ffffff",
    notes: [],
    ...overrides,
  };
}

const books: Book[] = [
  book({
    id: "unread-sf",
    title: "銀河鉄道の夜",
    author: "宮沢賢治",
    status: "unread",
    genre: "sf",
  }),
  book({
    id: "reading-history",
    title: "夜と霧",
    author: "ヴィクトール・フランクル",
    status: "reading",
    genre: "history",
  }),
  book({
    id: "completed-sf",
    title: "星の王子さま",
    author: "サン=テグジュペリ",
    status: "completed",
    genre: "sf",
  }),
];

describe("filterBooks", () => {
  it("filters by reading status and genre together", () => {
    const result = filterBooks(books, {
      activeFilter: "unread",
      query: "",
      genre: "sf",
    });

    expect(result.map((item) => item.id)).toEqual(["unread-sf"]);
  });

  it("matches the search query against title, author, and genre", () => {
    expect(
      filterBooks(books, {
        activeFilter: "all",
        query: "賢治",
        genre: "all",
      }).map((item) => item.id),
    ).toEqual(["unread-sf"]);

    expect(
      filterBooks(books, {
        activeFilter: "all",
        query: "history",
        genre: "all",
      }).map((item) => item.id),
    ).toEqual(["reading-history"]);
  });

  it("keeps genres that are not in the GENRES labels", () => {
    const custom = book({ id: "custom", genre: "詩集" });

    expect(getGenreOptions([...books, custom])).toContainEqual({
      id: "詩集",
      label: "詩集",
    });
    expect(
      filterBooks([...books, custom], {
        activeFilter: "all",
        query: "",
        genre: "詩集",
      }).map((item) => item.id),
    ).toEqual(["custom"]);
  });
});

describe("useLibraryFilterStore", () => {
  beforeEach(() => {
    useLibraryFilterStore.getState().resetFilters();
  });

  it("resets the query, status, and genre together", () => {
    const state = useLibraryFilterStore.getState();
    state.setQuery("銀河");
    state.setFilter("unread");
    state.setGenre("sf");

    useLibraryFilterStore.getState().resetFilters();

    expect(useLibraryFilterStore.getState()).toMatchObject({
      activeFilter: "all",
      query: "",
      genre: "all",
    });
  });

  it("clears the query and genre without resetting the status tab", () => {
    const state = useLibraryFilterStore.getState();
    state.setQuery("銀河");
    state.setFilter("unread");
    state.setGenre("sf");

    useLibraryFilterStore.getState().clearSearch();

    expect(useLibraryFilterStore.getState()).toMatchObject({
      activeFilter: "unread",
      query: "",
      genre: "all",
    });
  });
});
