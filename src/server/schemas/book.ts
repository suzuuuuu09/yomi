import { z } from "@hono/zod-openapi";

// 検索時のクエリ
export const SearchQuerySchema = z.object({
  q: z.string().optional().openapi({ example: "TypeScript" }),
  isbn: z.string().optional().openapi({ example: "9784000000000" }),
  index: z.coerce.number().default(0).openapi({ example: 0 }),
  results: z.coerce.number().default(10).openapi({ example: 10 }),
});

// Google Books APIのレスポンスのスキーマ
const IndustryIdentifierSchema = z.object({
  type: z.string().openapi({ example: "ISBN_13" }),
  identifier: z.string().openapi({ example: "9784000000000" }),
});

// Google Books APIのvolumeInfoのスキーマ
const VolumeInfoSchema = z.object({
  title: z.string().openapi({ example: "TypeScript入門" }),
  authors: z
    .array(z.string())
    .optional()
    .openapi({ example: ["山田太郎"] }),
  publisher: z.string().optional(),
  publishedDate: z.string().optional(),
  description: z.string().optional(),
  industryIdentifiers: z.array(IndustryIdentifierSchema).optional(),
  pageCount: z.number().optional(),
  imageLinks: z
    .object({
      smallThumbnail: z.url().optional(),
      thumbnail: z.url().optional(),
    })
    .optional(),
  language: z.string().optional(),
  previewLink: z.url().optional(),
});

// Google Books APIのアイテムのスキーマ
const BookItemSchema = z.object({
  id: z.string().openapi({ example: "zT3GEAAAQBAJ" }),
  volumeInfo: VolumeInfoSchema,
});

// Google Books APIのレスポンス全体のスキーマ
export const BookResponseSchema = z
  .object({
    totalItems: z.number().openapi({ example: 1 }),
    items: z.array(BookItemSchema).optional(), // 検索結果0件の場合はitemsが含まれないことがあるためoptional
  })
  .openapi("BookResponse");

// 変換後の本のデータのスキーマ
const BookDataSchema = z.object({
  id: z.string().openapi({ example: "zT3GEAAAQBAJ" }),
  title: z.string().openapi({ example: "TypeScript入門" }),
  authors: z
    .array(z.string())
    .optional()
    .openapi({ example: ["山田太郎"] }),
  publisher: z.string().optional(),
  publishedDate: z.string().optional().openapi({ example: "2025-01-01" }),
  description: z.string().optional(),
  isbn: z.string().nullable().optional(),
  page: z.number().optional(),
  thumbnail: z.url().nullable().optional(),
});

// クライアントに返すレスポンスのスキーマ
export const FinalResponseSchema = z
  .object({
    totalItems: z.number().openapi({ example: 1 }),
    books: z.array(BookDataSchema).optional(),
  })
  .openapi("BookResponse");

export type BookItem = z.infer<typeof BookResponseSchema>;
