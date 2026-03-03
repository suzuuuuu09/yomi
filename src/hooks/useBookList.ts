import { useCallback } from "react";
import useBookListStore from "@/store/useBookListStore";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book } from "@/types/library";

export function useBookList() {
  const close = useBookListStore((s) => s.close);
  const setSelectedBook = useLibraryStore((s) => s.setSelectedBook);

  const handleSelectBook = useCallback(
    (book: Book) => {
      setSelectedBook(book);
      close();
    },
    [setSelectedBook, close],
  );

  return { handleSelectBook };
}
