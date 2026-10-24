import { useEffect } from "react";
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
    archiveBook,
    readingStats,
    readingLogsByBookId,
    fetchReadingLogs,
    updateReadingLog,
    deleteReadingLog,
    permanentlyDeleteBook,
  } = useLibraryStore();

  const book = books.find((b) => b.id === selectedBookId) ?? null;

  useEffect(() => {
    if (selectedBookId) void fetchReadingLogs(selectedBookId);
  }, [selectedBookId, fetchReadingLogs]);

  return {
    book,
    onClose: () => setSelectedBook(null),
    onUpdateBook: updateBook,
    onPageUpdate: updatePageProgress,
    onPageSet: setPageProgress,
    onAddNote: addNote,
    onDeleteNote: deleteNote,
    onArchiveBook: archiveBook,
    onPermanentlyDeleteBook: permanentlyDeleteBook,
    readingStats,
    readingLogs: selectedBookId
      ? (readingLogsByBookId[selectedBookId] ?? [])
      : [],
    onUpdateReadingLog: updateReadingLog,
    onDeleteReadingLog: deleteReadingLog,
  };
}
