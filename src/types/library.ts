export type BookStatus = "unread" | "reading" | "completed";

export interface ReadingNote {
  id: string;
  content: string;
  page: number | null;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  genre: string;
  coverUrl: string;
  registeredAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  position: [number, number, number];
  brightness: number;
  color: string;
  notes: ReadingNote[];
}

export interface ReadingLog {
  id: string;
  date: string;
  pagesRead: number;
  readingDay?: number | null;
  readingTimezoneRevision?: number;
}

export interface ReadingDay {
  date: string;
  pagesRead: number;
  readingDay?: number;
}

export interface ReadingStats {
  days: ReadingDay[];
  streak: number;
  readingTimezone: string | null;
}
