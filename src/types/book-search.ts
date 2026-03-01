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

export type BookSearchMode = "manual" | "search" | "isbn";

export interface BookSearchState {
  mode: BookSearchMode;
  query: string;
  searchResults: BookSearchResult[];
  totalItems: number;
  currentPage: number;
  isSearching: boolean;
  hasSearched: boolean;
  selectedResult: BookSearchResult | null;

  // アクション
  setMode: (mode: BookSearchMode) => void;
  setQuery: (query: string) => void;
  setSelectedResult: (result: BookSearchResult | null) => void;
  fetchPage: (page: number) => Promise<void>;
  reset: () => void;
}
