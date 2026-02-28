export interface BookSearchResult {
  id: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  isbn: string | null;
  page?: number;
  thumbnail?: string | null;
}

export interface BookSearchResponse {
  totalItems: number;
  books?: BookSearchResult[];
}

const API_BASE = "https://yomi-api.suzuuuuu09.com";

export async function searchBooks(
  query: string,
  options?: { index?: number; results?: number },
): Promise<BookSearchResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (options?.index != null) params.set("index", String(options.index));
  if (options?.results) params.set("results", String(options.results));

  const res = await fetch(`${API_BASE}/search?${params}`);
  if (!res.ok) {
    throw new Error(
      `APIのリクエストに失敗しました。${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

export async function searchByISBN(isbn: string): Promise<BookSearchResponse> {
  const params = new URLSearchParams();
  params.set("isbn", isbn.replace(/[-\s]/g, "")); // ハイフンやスペースを除去する
  params.set("results", "1");

  const res = await fetch(`${API_BASE}/search?${params}`);
  if (!res.ok) {
    throw new Error(
      `APIのリクエストに失敗しました。ISBNによる検索。${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}
