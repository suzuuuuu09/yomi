import { useMemo } from "react";
import useLibraryStore from "@/store/useLibraryStore";
import useLibraryFilterStore from "@/store/useLibraryFilterStore";

export function useFilteredBooks() {
  const books = useLibraryStore((s) => s.books);
  const { activeFilter, query } = useLibraryFilterStore();

  return useMemo(() => {
    let result = books;

    if (activeFilter !== "all") {
      result = result.filter((b) => b.status === activeFilter);
    }

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q),
      );
    }

    return result;
  }, [books, activeFilter, query]);
}
