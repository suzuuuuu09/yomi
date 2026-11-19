import { useMemo } from "react";
import { GENRES } from "@/consts/genre";
import useLibraryFilterStore, {
  ALL_GENRES,
} from "@/store/useLibraryFilterStore";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book, BookStatus } from "@/types/library";

export interface LibraryFilters {
  activeFilter: BookStatus | "all";
  query: string;
  genre: string;
}

export interface GenreOption {
  id: string;
  label: string;
}

export function filterBooks(
  books: Book[],
  { activeFilter, query, genre }: LibraryFilters,
) {
  let result = books;

  if (activeFilter !== "all") {
    result = result.filter((book) => book.status === activeFilter);
  }

  if (genre !== ALL_GENRES) {
    result = result.filter((book) => book.genre === genre);
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) {
    result = result.filter(
      (book) =>
        book.title.toLowerCase().includes(normalizedQuery) ||
        book.author.toLowerCase().includes(normalizedQuery) ||
        book.genre.toLowerCase().includes(normalizedQuery),
    );
  }

  return result;
}

export function getGenreOptions(books: Book[]): GenreOption[] {
  const present = new Set(
    books.map((book) => book.genre.trim()).filter(Boolean),
  );
  const known = new Set(GENRES.map((genre) => genre.id));
  const options = GENRES.filter((genre) => present.has(genre.id)).map(
    ({ id, label }) => ({ id, label }),
  );
  const extras = [...present]
    .filter((genre) => !known.has(genre))
    .sort()
    .map((genre) => ({ id: genre, label: genre }));

  return [...options, ...extras];
}

export function useFilteredBooks() {
  const books = useLibraryStore((s) => s.books);
  const { activeFilter, query, genre } = useLibraryFilterStore();

  return useMemo(
    () => filterBooks(books, { activeFilter, query, genre }),
    [books, activeFilter, query, genre],
  );
}
