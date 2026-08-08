import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, sql } from "drizzle-orm";
import { apiError } from "@/server/lib/api-error";
import { toBookResponse } from "@/server/lib/book-response";
import { pageToStatus, resolveCompletedAt } from "@/server/lib/book-status";
import { getDBFromContext } from "@/server/lib/db";
import {
  computeBrightness,
  computeColor,
  computeConstellationLines,
  computePosition,
} from "@/server/lib/star-formation";
import { authMiddleware } from "@/server/middleware/auth";
import {
  CreateBookSchema,
  NoteCreateSchema,
  ProgressUpdateSchema,
  UpdateBookSchema,
} from "@/server/schemas/books";
import { books, readingNotes } from "@/server/schemas/db";
import type { AppEnv } from "@/server/types";

const booksApp = new OpenAPIHono<AppEnv>();
type Database = ReturnType<typeof getDBFromContext>;

// 全ルートに認証ミドルウェアを適用
booksApp.use("/*", authMiddleware);

function invalidRequest(
  c: Parameters<typeof apiError>[0],
  error: { issues: { path: PropertyKey[]; message: string }[] },
) {
  return apiError(
    c,
    400,
    "INVALID_REQUEST",
    "入力値が不正です",
    error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  );
}

async function readBookWithNotes(db: Database, userId: string, bookId: string) {
  const rows = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);

  const book = rows[0];
  if (!book) return null;

  const notes = await db
    .select()
    .from(readingNotes)
    .where(
      and(eq(readingNotes.bookId, bookId), eq(readingNotes.userId, userId)),
    );

  return { book, notes };
}

async function readJson(c: Parameters<typeof apiError>[0]) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// ユーザーの本一覧を取得
booksApp.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const db = getDBFromContext();
  const userBooks = await db
    .select()
    .from(books)
    .where(eq(books.userId, user.id));

  const bookIds = userBooks.map((book) => book.id);
  const notesByBookId: Record<string, (typeof readingNotes.$inferSelect)[]> =
    {};

  if (bookIds.length > 0) {
    const notesRows = await db
      .select()
      .from(readingNotes)
      .where(eq(readingNotes.userId, user.id));

    for (const note of notesRows) {
      const notes = notesByBookId[note.bookId] ?? [];
      notes.push(note);
      notesByBookId[note.bookId] = notes;
    }
  }

  const result = userBooks.map((book) =>
    toBookResponse(book, notesByBookId[book.id] ?? []),
  );

  return c.json({
    books: result,
    constellationLines: computeConstellationLines(userBooks),
  });
});

// 本を追加
booksApp.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const rawBody = await readJson(c);
  const parsed = CreateBookSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequest(c, parsed.error);

  const input = parsed.data;
  const db = getDBFromContext();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status = pageToStatus(input.currentPage, input.totalPages);

  const existingBooks = await db
    .select({
      positionX: books.positionX,
      positionY: books.positionY,
      positionZ: books.positionZ,
    })
    .from(books)
    .where(eq(books.userId, user.id));

  const existingPositions = existingBooks.map(
    (book) =>
      [book.positionX, book.positionY, book.positionZ] as [
        number,
        number,
        number,
      ],
  );
  const [positionX, positionY, positionZ] = computePosition(
    input.genre,
    existingPositions,
  );
  const brightness = computeBrightness(input.currentPage, input.totalPages);
  const color = computeColor(input.genre, brightness);

  try {
    await db.insert(books).values({
      id,
      userId: user.id,
      title: input.title,
      author: input.author,
      isbn: input.isbn,
      totalPages: input.totalPages,
      currentPage: input.currentPage,
      status,
      genre: input.genre,
      coverUrl: input.coverUrl,
      positionX,
      positionY,
      positionZ,
      brightness,
      color,
      registeredAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Book creation failed", error);
    return apiError(c, 500, "INTERNAL_ERROR", "本を登録できませんでした");
  }

  const created = await readBookWithNotes(db, user.id, id);
  if (!created) {
    return apiError(
      c,
      500,
      "INTERNAL_ERROR",
      "登録した本を取得できませんでした",
    );
  }

  return c.json(
    {
      id,
      position: [positionX, positionY, positionZ] as [number, number, number],
      brightness,
      color,
      book: toBookResponse(created.book, created.notes),
    },
    201,
  );
});

// currentPageの更新をSQL式で行う。deltaは複数タブからの同時更新にも対応する。
booksApp.post("/:id/progress", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const rawBody = await readJson(c);
  const parsed = ProgressUpdateSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequest(c, parsed.error);

  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId);
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  const { delta, page } = parsed.data;
  if (
    page !== undefined &&
    existing.book.totalPages > 0 &&
    page > existing.book.totalPages
  ) {
    return apiError(
      c,
      400,
      "INVALID_REQUEST",
      "ページ数は総ページ数以下で指定してください",
    );
  }

  const nextPage =
    delta === undefined
      ? page
      : sql<number>`CASE WHEN ${books.totalPages} > 0 THEN min(${books.totalPages}, max(0, ${books.currentPage} + ${delta})) ELSE max(0, ${books.currentPage} + ${delta}) END`;

  const now = new Date().toISOString();
  await db
    .update(books)
    .set({ currentPage: nextPage, updatedAt: now })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  const updated = await readBookWithNotes(db, user.id, bookId);
  if (!updated) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  const status = pageToStatus(
    updated.book.currentPage,
    updated.book.totalPages,
  );
  const completedAt = resolveCompletedAt(
    status,
    updated.book.status,
    now,
    updated.book.completedAt,
  );
  const brightness = computeBrightness(
    updated.book.currentPage,
    updated.book.totalPages,
  );
  const color = computeColor(updated.book.genre, brightness);

  // ページがさらに進んでいた場合は、古いリクエストが派生状態を上書きしない。
  await db
    .update(books)
    .set({ status, completedAt, brightness, color, updatedAt: now })
    .where(
      and(
        eq(books.id, bookId),
        eq(books.userId, user.id),
        eq(books.currentPage, updated.book.currentPage),
        eq(books.totalPages, updated.book.totalPages),
        eq(books.genre, updated.book.genre),
        eq(books.status, updated.book.status),
      ),
    );

  const current = await readBookWithNotes(db, user.id, bookId);
  if (!current) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  return c.json({
    ok: true,
    book: toBookResponse(current.book, current.notes),
  });
});

// 本を編集
booksApp.put("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const rawBody = await readJson(c);
  const parsed = UpdateBookSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequest(c, parsed.error);

  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId);
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  const input = parsed.data;
  const newTotalPages = input.totalPages ?? existing.book.totalPages;
  if (newTotalPages > 0 && existing.book.currentPage > newTotalPages) {
    return apiError(
      c,
      400,
      "INVALID_REQUEST",
      "総ページ数は現在のページ数以上で指定してください",
    );
  }

  const newGenre = input.genre ?? existing.book.genre;
  const newBrightness = computeBrightness(
    existing.book.currentPage,
    newTotalPages,
  );
  const newColor = computeColor(newGenre, newBrightness);
  const newStatus = pageToStatus(existing.book.currentPage, newTotalPages);
  const now = new Date().toISOString();

  try {
    await db
      .update(books)
      .set({
        ...input,
        totalPages: newTotalPages,
        brightness: newBrightness,
        color: newColor,
        status: newStatus,
        completedAt: resolveCompletedAt(
          newStatus,
          existing.book.status,
          now,
          existing.book.completedAt,
        ),
        updatedAt: now,
      })
      .where(and(eq(books.id, bookId), eq(books.userId, user.id)));
  } catch (error) {
    console.error("Book update failed", error);
    return apiError(c, 500, "INTERNAL_ERROR", "本を更新できませんでした");
  }

  const current = await readBookWithNotes(db, user.id, bookId);
  if (!current) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  return c.json({
    ok: true,
    book: toBookResponse(current.book, current.notes),
  });
});

// 本を削除
booksApp.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId);
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  await db
    .delete(books)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  return c.json({ ok: true });
});

// ノートの追加
booksApp.post("/:id/notes", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const rawBody = await readJson(c);
  const parsed = NoteCreateSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequest(c, parsed.error);

  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId);
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  const noteId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.insert(readingNotes).values({
      id: noteId,
      bookId,
      userId: user.id,
      content: parsed.data.content,
      page: parsed.data.page ?? null,
      createdAt: now,
    });
  } catch (error) {
    console.error("Note creation failed", error);
    return apiError(c, 500, "INTERNAL_ERROR", "ノートを追加できませんでした");
  }

  return c.json({ id: noteId }, 201);
});

// ノートを削除
booksApp.delete("/:bookId/notes/:noteId", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const bookId = c.req.param("bookId");
  const noteId = c.req.param("noteId");
  const db = getDBFromContext();
  const note = await db
    .select({ id: readingNotes.id })
    .from(readingNotes)
    .where(
      and(
        eq(readingNotes.id, noteId),
        eq(readingNotes.bookId, bookId),
        eq(readingNotes.userId, user.id),
      ),
    )
    .limit(1);
  if (note.length === 0) {
    return apiError(c, 404, "NOT_FOUND", "ノートが見つかりません");
  }

  await db
    .delete(readingNotes)
    .where(
      and(
        eq(readingNotes.id, noteId),
        eq(readingNotes.bookId, bookId),
        eq(readingNotes.userId, user.id),
      ),
    );

  return c.json({ ok: true });
});

export default booksApp;
