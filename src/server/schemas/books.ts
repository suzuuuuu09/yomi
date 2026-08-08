import { z } from "@hono/zod-openapi";

const MAX_PAGE = 1_000_000;

const titleSchema = z.string().trim().min(1).max(200);
const authorSchema = z.string().trim().max(200);
const isbnSchema = z.string().trim().max(32);
const genreSchema = z.string().trim().max(100);
const coverUrlSchema = z.string().trim().max(2048);
const pagesSchema = z.number().int().min(0).max(MAX_PAGE);

const progressRelation = ({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) => totalPages === 0 || currentPage <= totalPages;

export const CreateBookSchema = z
  .object({
    title: titleSchema,
    author: authorSchema.default(""),
    isbn: isbnSchema.default(""),
    totalPages: pagesSchema.default(0),
    currentPage: pagesSchema.default(0),
    status: z.enum(["unread", "reading", "completed"]).optional(),
    genre: genreSchema.default(""),
    coverUrl: coverUrlSchema.default(""),
  })
  .refine(progressRelation, {
    message: "currentPageはtotalPages以下で指定してください",
    path: ["currentPage"],
  });

export const UpdateBookSchema = z
  .object({
    title: titleSchema.optional(),
    author: authorSchema.optional(),
    isbn: isbnSchema.optional(),
    totalPages: pagesSchema.optional(),
    genre: genreSchema.optional(),
    coverUrl: coverUrlSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "更新する項目を1つ以上指定してください",
  });

export const NoteCreateSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
  page: pagesSchema.min(1).nullable().optional(),
});

export const ProgressUpdateSchema = z
  .object({
    delta: z.number().int().min(-MAX_PAGE).max(MAX_PAGE).optional(),
    page: pagesSchema.optional(),
  })
  .refine(({ delta, page }) => (delta === undefined) !== (page === undefined), {
    message: "deltaまたはpageのどちらか一方を指定してください",
  });

export type CreateBookInput = z.infer<typeof CreateBookSchema>;
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>;
export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;
export type ProgressUpdateInput = z.infer<typeof ProgressUpdateSchema>;
