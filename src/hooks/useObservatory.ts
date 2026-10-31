import { useCallback } from "react";
import { useBookCount } from "@/hooks/useBookCount";
import { useFilteredBooks } from "@/hooks/useFilteredBooks";
import useBookListStore from "@/store/useBookListStore";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book } from "@/types/library";

export function useObservatory() {
  const { selectedBookId, addBook, setSelectedBook } = useLibraryStore();
  const isAddModalOpen = useBookListStore(
    (state) => state.activePanel === "add",
  );
  const setIsAddModalOpen = (open: boolean) => {
    const ui = useBookListStore.getState();
    if (open) ui.setPanel("add");
    else ui.closePanel("add");
  };

  const filteredBooks = useFilteredBooks();
  const bookCount = useBookCount();

  const handleStarClick = useCallback(
    (book: Book) => {
      useBookListStore.getState().setPanel(null);
      setSelectedBook(book);
    },
    [setSelectedBook],
  );

  const handleAdd = addBook;

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
