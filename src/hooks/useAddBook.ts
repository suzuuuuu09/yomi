import { useState } from "react";
import { useBookSearchStore } from "@/store/useBookSearchStore";
import type { BookInfoValues, BookSearchResult } from "@/types/book-search";
import type { Book } from "@/types/library";

const EMPTY_FORM: BookInfoValues = {
  title: "",
  author: "",
  pages: "",
  genre: "",
  isbn: "",
};

export function useAddBook(
  onAddAction: (book: Partial<Book>) => void,
  onCloseAction: () => void,
) {
  const store = useBookSearchStore();
  const [form, setForm] = useState<BookInfoValues>(EMPTY_FORM);

  const setField =
    (key: keyof BookInfoValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSelectResult = (book: BookSearchResult) => {
    store.setSelectedResult(book);
    setForm((prev) => ({
      ...prev,
      title: book.title,
      author: book.authors?.join(", ") ?? "",
      pages: book.page ? String(book.page) : "",
      isbn: book.isbn ?? "",
    }));
  };

  const handleSubmit = () => {
    const title = store.selectedResult?.title || form.title;
    if (!title) return;

    onAddAction({
      title,
      author: store.selectedResult?.authors?.join(", ") || form.author,
      isbn: form.isbn || store.selectedResult?.isbn || "",
      totalPages:
        store.selectedResult?.page || Number.parseInt(form.pages, 10) || 0,
      genre: form.genre,
      coverUrl:
        store.selectedResult?.thumbnail?.replace("http://", "https://") || "",
      currentPage: 0,
      status: "unread",
    });

    setForm(EMPTY_FORM);
    store.reset();
    onCloseAction();
  };

  const canSubmit = !!form.title || !!store.selectedResult?.title;

  return { store, form, setField, handleSelectResult, handleSubmit, canSubmit };
}
