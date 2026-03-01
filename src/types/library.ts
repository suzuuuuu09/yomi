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
  position: [number, number, number];
  brightness: number;
  color: string;
  notes: ReadingNote[];
}

export interface ReadingLog {
  date: string;
  pagesRead: number;
}
