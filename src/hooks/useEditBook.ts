import { useEffect, useState } from "react";
import type { Book } from "@/types/library";
import type { BookInfoValues } from "@/types/book-search";

export function useEditBook(book: Book | null) {
  const [editForm, setEditForm] = useState<BookInfoValues>({
    title: "",
    author: "",
    pages: "",
    isbn: "",
    genre: "",
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: book?.id
  useEffect(() => {
    if (book) {
      setEditForm({
        title: book.title,
        author: book.author,
        pages: String(book.totalPages),
        isbn: book.isbn || "",
        genre: book.genre,
      });
    }
  }, [book?.id]);

  const handleChange = (field: keyof BookInfoValues, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildUpdates = (): Partial<Book> => ({
    title: editForm.title,
    author: editForm.author,
    totalPages: Number.parseInt(editForm.pages, 10) || 0,
    isbn: editForm.isbn,
    genre: editForm.genre,
  });

  return { editForm, handleChange, buildUpdates };
}
