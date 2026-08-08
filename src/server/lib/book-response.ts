import type { books, readingNotes } from "@/server/schemas/db";
import type { Book, ReadingNote } from "@/types/library";

type BookRow = typeof books.$inferSelect;
type NoteRow = typeof readingNotes.$inferSelect;

export function toBookResponse(book: BookRow, notes: NoteRow[] = []): Book {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn ?? "",
    totalPages: book.totalPages,
    currentPage: book.currentPage,
    status: book.status,
    genre: book.genre,
    coverUrl: book.coverUrl ?? "",
    registeredAt: book.registeredAt,
    completedAt: book.completedAt,
    position: [book.positionX, book.positionY, book.positionZ],
    brightness: book.brightness,
    color: book.color,
    notes: notes.map<ReadingNote>((note) => ({
      id: note.id,
      content: note.content,
      page: note.page,
      createdAt: note.createdAt,
    })),
  };
}
