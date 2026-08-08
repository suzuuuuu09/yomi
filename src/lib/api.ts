import { requestJson } from "@/lib/api-client";
import type { BookSearchResponse, BookSearchResult } from "@/types/book-search";

const API_BASE = "/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBookSearchResponse(value: unknown): BookSearchResponse {
  if (
    !isRecord(value) ||
    typeof value.totalItems !== "number" ||
    (value.books !== undefined && !Array.isArray(value.books))
  ) {
    throw new Error("Invalid book search response");
  }

  const books = value.books?.map((book) => {
    if (
      !isRecord(book) ||
      typeof book.id !== "string" ||
      typeof book.title !== "string" ||
      !Array.isArray(book.authors) ||
      !book.authors.every((author) => typeof author === "string") ||
      (book.isbn !== null &&
        book.isbn !== undefined &&
        typeof book.isbn !== "string")
    ) {
      throw new Error("Invalid book search result");
    }
    return book as unknown as BookSearchResult;
  });

  return { totalItems: value.totalItems, books };
}

export async function searchBooks(
  query: string,
  options?: { index?: number; results?: number },
): Promise<BookSearchResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (options?.index != null) params.set("index", String(options.index));
  if (options?.results) params.set("results", String(options.results));

  return requestJson(
    `${API_BASE}/search?${params}`,
    undefined,
    parseBookSearchResponse,
  );
}

export async function searchByISBN(isbn: string): Promise<BookSearchResponse> {
  const params = new URLSearchParams();
  params.set("isbn", isbn.replace(/[-\s]/g, "")); // ハイフンやスペースを除去する
  params.set("results", "1");

  return requestJson(
    `${API_BASE}/search?${params}`,
    undefined,
    parseBookSearchResponse,
  );
}
