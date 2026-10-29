import { z } from "@hono/zod-openapi";
import { isValidTimeZone } from "@/server/lib/reading-log";
import {
  CreateBookSchema,
  NoteCreateSchema,
  ReadingLogDateSchema,
} from "@/server/schemas/books";

const timestamp = z
  .string()
  .max(100)
  .refine((value) => Number.isFinite(Date.parse(value)), "日時が不正です");
const integer = z.number().int().safe();

export const GuestLogSchema = z.object({
  id: z.uuid(),
  date: ReadingLogDateSchema.shape.date,
  pagesRead: integer.min(1).max(1_000_000),
  readingDay: integer.min(-100_000_000).max(100_000_000),
  readingTimezoneRevision: integer.min(0),
});

export const GuestBookSchema = z
  .object({
    ...CreateBookSchema.shape,
    id: z.uuid(),
    status: z.enum(["unread", "reading", "completed"]),
    registeredAt: timestamp,
    completedAt: timestamp.nullable(),
    archivedAt: timestamp.nullable(),
    position: z.tuple([
      z.number().finite(),
      z.number().finite(),
      z.number().finite(),
    ]),
    brightness: z.number().min(0).max(1),
    color: z
      .string()
      .max(100)
      .regex(/^(#[0-9a-fA-F]{3,8}|hsl\([\d.,%\s]+\))$/),
    notes: z.array(
      z.object({
        ...NoteCreateSchema.shape,
        page: NoteCreateSchema.shape.page.unwrap(),
        id: z.uuid(),
        createdAt: timestamp,
      }),
    ),
    logs: z.array(GuestLogSchema),
  })
  .refine(
    (book) => book.totalPages === 0 || book.currentPage <= book.totalPages,
    "進捗が総ページ数を超えています",
  )
  .refine(
    (book) =>
      new Set(book.notes.map((note) => note.id)).size === book.notes.length,
    "メモIDが重複しています",
  )
  .refine(
    (book) =>
      new Set(
        book.logs.map((log) => `${log.readingTimezoneRevision}:${log.date}`),
      ).size === book.logs.length,
    "読書ログが重複しています",
  )
  .refine(
    (book) => new Set(book.logs.map((log) => log.id)).size === book.logs.length,
    "読書ログIDが重複しています",
  )
  .refine(
    (book) =>
      new TextEncoder().encode(JSON.stringify(book)).length <= 1_000_000,
    "1冊の記録は1MBまでです。バックアップを書き出し、不要なメモ・ログを整理してください",
  );

export const GuestSettingsSchema = z.object({
  readingTimezone: z.string().max(100).refine(isValidTimeZone),
  readingDayOffset: integer.min(-100_000).max(100_000),
  readingTimezoneRevision: integer.min(0),
});

export const GuestSnapshotSchema = z
  .object({
    version: z.literal(1),
    libraryId: z.uuid(),
    ...GuestSettingsSchema.shape,
    books: z.array(GuestBookSchema),
  })
  .refine(
    (value) =>
      new Set(value.books.map((book) => book.id)).size === value.books.length,
    "本IDが重複しています",
  );

export const GuestImportSchema = z.object({
  expectedUserId: z.string().min(1).max(200),
  libraryId: z.uuid(),
  ...GuestSettingsSchema.shape,
  book: GuestBookSchema,
});

export type GuestSnapshot = z.infer<typeof GuestSnapshotSchema>;
export type GuestBook = z.infer<typeof GuestBookSchema>;
