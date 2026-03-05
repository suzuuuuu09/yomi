import useLibraryStore from "@/store/useLibraryStore";

export function useStarInsight() {
  const {
    books,
    selectedBookId,
    setSelectedBook,
    updateBook,
    updatePageProgress,
    setPageProgress,
    addNote,
    deleteNote,
    deleteBook,
  } = useLibraryStore();

  const book = books.find((b) => b.id === selectedBookId) ?? null;

  return {
    book,
    onClose: () => setSelectedBook(null),
    onUpdateBook: updateBook,
    onPageUpdate: updatePageProgress,
    onPageSet: setPageProgress,
    onAddNote: addNote,
    onDeleteNote: deleteNote,
    onDeleteBook: deleteBook,
  };
}
