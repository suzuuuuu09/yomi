import { useCallback, useState } from "react";
import { useBookCount } from "@/hooks/useBookCount";
import { useFilteredBooks } from "@/hooks/useFilteredBooks";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book } from "@/types/library";

export function useObservatory() {
  const { selectedBookId, addBook, setSelectedBook } = useLibraryStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredBooks = useFilteredBooks();
  const bookCount = useBookCount();

  const handleStarClick = useCallback(
    (book: Book) => setSelectedBook(book),
    [setSelectedBook],
  );

  const handleAdd = useCallback(
    (partial: Partial<Book>) => {
      addBook(partial);
      setIsAddModalOpen(false);
    },
    [addBook],
  );

  return {
    filteredBooks,
    bookCount,
    selectedBookId,
    isAddModalOpen,
    setIsAddModalOpen,
    handleStarClick,
    handleAdd,
  };
}
