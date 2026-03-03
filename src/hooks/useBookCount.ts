import { useMemo } from "react";
import useLibraryStore from "@/store/useLibraryStore";

export function useBookCount() {
  const books = useLibraryStore((s) => s.books);

  return useMemo(
    () => ({
      all: books.length,
      reading: books.filter((b) => b.status === "reading").length,
      unread: books.filter((b) => b.status === "unread").length,
      completed: books.filter((b) => b.status === "completed").length,
    }),
    [books],
  );
}
