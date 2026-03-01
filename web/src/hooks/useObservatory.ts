import { useCallback, useState } from "react";
import useLibraryStore from "@/store/useLibraryStore";
import { useFilteredBooks } from "@/hooks/useFilteredBooks";
import type { Book } from "@/types/library";
import { useBookCount } from "@/hooks/useBookCount";

export function useObservatory() {
  const { selectedBookId, addBook, setSelectedBook } = useLibraryStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBookListOpen, setIsBookListOpen] = useState(false);

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
    isBookListOpen,
    setIsBookListOpen,
    handleStarClick,
    handleAdd,
  };
}
