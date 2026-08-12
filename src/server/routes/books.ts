import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { apiError } from "@/server/lib/api-error";
import { toBookResponse } from "@/server/lib/book-response";
import { pageToStatus, resolveCompletedAt } from "@/server/lib/book-status";
import { getDBFromContext } from "@/server/lib/db";
import { isValidTimeZone } from "@/server/lib/reading-log";
import {
  applyReadingLogDelta,
  ensureReadingSettings,
  MissingReadingTimezoneError,
} from "@/server/lib/reading-log-db";
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
type Database = Pick<
  ReturnType<typeof getDBFromContext>,
  "select" | "update" | "insert" | "delete"
>;

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

async function readBookWithNotes(
  db: Database,
  userId: string,
  bookId: string,
  options?: { activeOnly?: boolean },
) {
  const predicates = [eq(books.id, bookId), eq(books.userId, userId)];
  if (options?.activeOnly) predicates.push(isNull(books.archivedAt));
  const rows = await db
    .select()
    .from(books)
    .where(and(...predicates))
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

async function updateCurrentPage(
  db: Database,
  userId: string,
  bookId: string,
  input: { delta?: number; page?: number },
  now: string,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readBookWithNotes(db, userId, bookId, {
      activeOnly: true,
    });
    if (!current) return null;

    const targetPage =
      input.delta === undefined
        ? (input.page ?? current.book.currentPage)
        : Math.max(
            0,
            current.book.totalPages > 0
              ? Math.min(
                  current.book.totalPages,
                  current.book.currentPage + input.delta,
                )
              : current.book.currentPage + input.delta,
          );
    const delta = targetPage - current.book.currentPage;
    if (delta === 0) return { current, delta: 0 };

    const result = await db
      .update(books)
      .set({ currentPage: targetPage, updatedAt: now })
      .where(
        and(
          eq(books.id, bookId),
          eq(books.userId, userId),
          isNull(books.archivedAt),
          eq(books.currentPage, current.book.currentPage),
        ),
      );
    const changes = (result as { meta?: { changes?: number } } | undefined)
      ?.meta?.changes;
    if (changes === undefined || changes === 1) {
      const updated = await readBookWithNotes(db, userId, bookId, {
        activeOnly: true,
      });
      if (!updated) return null;
      return { current: updated, delta };
    }
  }

  throw new Error("Concurrent progress update could not be applied");
}

// ユーザーの本一覧を取得
booksApp.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const db = getDBFromContext();
  const userBooks = await db
    .select()
    .from(books)
    .where(and(eq(books.userId, user.id), isNull(books.archivedAt)));

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

// アーカイブ済みの本を復元用に取得
booksApp.get("/archived", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const db = getDBFromContext();
  const archivedBooks = await db
    .select()
    .from(books)
    .where(and(eq(books.userId, user.id), isNotNull(books.archivedAt)));
  const notes = await db
    .select()
    .from(readingNotes)
    .where(eq(readingNotes.userId, user.id));
  const notesByBookId = new Map<string, (typeof readingNotes.$inferSelect)[]>();
  for (const note of notes) {
    const list = notesByBookId.get(note.bookId) ?? [];
    list.push(note);
    notesByBookId.set(note.bookId, list);
  }
  return c.json({
    books: archivedBooks.map((book) =>
      toBookResponse(book, notesByBookId.get(book.id) ?? []),
    ),
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
      archivedAt: null,
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

// currentPageは比較更新で適用し、競合時は最新値を読み直して再試行する。
booksApp.post("/:id/progress", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const rawBody = await readJson(c);
  const parsed = ProgressUpdateSchema.safeParse(rawBody);
  if (!parsed.success) return invalidRequest(c, parsed.error);

  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId, {
    activeOnly: true,
  });
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  const { delta, page, readingTimezone } = parsed.data;
  if (readingTimezone !== undefined && !isValidTimeZone(readingTimezone)) {
    return invalidRequest(c, {
      issues: [
        {
          path: ["readingTimezone"],
          message: "IANAタイムゾーンを指定してください",
        },
      ],
    });
  }
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

  const nowDate = new Date();
  const now = nowDate.toISOString();
  let progress: Awaited<ReturnType<typeof updateCurrentPage>>;
  try {
    progress = await db.transaction(async (tx) => {
      const settings = await ensureReadingSettings(
        tx,
        user.id,
        readingTimezone,
      );
      const next = await updateCurrentPage(
        tx,
        user.id,
        bookId,
        { delta, page },
        now,
      );
      if (!next) return null;

      await applyReadingLogDelta(tx, {
        bookId,
        userId: user.id,
        delta: next.delta,
        now: nowDate,
        timeZone: settings.readingTimezone,
        readingDayOffset: settings.readingDayOffset,
        readingTimezoneRevision: settings.readingTimezoneRevision,
      });

      const status = pageToStatus(
        next.current.book.currentPage,
        next.current.book.totalPages,
      );
      const completedAt = resolveCompletedAt(
        status,
        next.current.book.status,
        now,
        next.current.book.completedAt,
      );
      const brightness = computeBrightness(
        next.current.book.currentPage,
        next.current.book.totalPages,
      );
      const color = computeColor(next.current.book.genre, brightness);

      await tx
        .update(books)
        .set({ status, completedAt, brightness, color, updatedAt: now })
        .where(
          and(
            eq(books.id, bookId),
            eq(books.userId, user.id),
            eq(books.currentPage, next.current.book.currentPage),
            eq(books.totalPages, next.current.book.totalPages),
            eq(books.genre, next.current.book.genre),
            eq(books.status, next.current.book.status),
          ),
        );

      return next;
    });
  } catch (error) {
    if (error instanceof MissingReadingTimezoneError) {
      return apiError(
        c,
        400,
        "INVALID_REQUEST",
        "初回の進捗更新には読書タイムゾーンが必要です",
      );
    }
    console.error("Book progress update failed", error);
    return apiError(
      c,
      500,
      "INTERNAL_ERROR",
      "進捗と読書ログを更新できませんでした",
    );
  }
  if (!progress) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

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
  const existing = await readBookWithNotes(db, user.id, bookId, {
    activeOnly: true,
  });
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

// 本をアーカイブ
booksApp.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");

  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId);
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");

  const now = new Date().toISOString();
  await db
    .update(books)
    .set({
      archivedAt: existing.book.archivedAt ?? now,
      updatedAt: now,
    })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  return c.json({ ok: true });
});

// 明示的なアーカイブ操作（DELETE /:id と同じ意味で、クライアントから利用する）
booksApp.post("/:id/archive", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");
  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId);
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");
  const now = new Date().toISOString();
  await db
    .update(books)
    .set({ archivedAt: existing.book.archivedAt ?? now, updatedAt: now })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));
  return c.json({ ok: true });
});

// アーカイブ済みの本を復元
booksApp.post("/:id/restore", async (c) => {
  const user = c.get("user");
  if (!user) return apiError(c, 401, "UNAUTHORIZED", "認証が必要です");
  const bookId = c.req.param("id");
  const db = getDBFromContext();
  const existing = await readBookWithNotes(db, user.id, bookId);
  if (!existing) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");
  const now = new Date().toISOString();
  await db
    .update(books)
    .set({ archivedAt: null, updatedAt: now })
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));
  const restored = await readBookWithNotes(db, user.id, bookId);
  if (!restored) return apiError(c, 404, "NOT_FOUND", "本が見つかりません");
  return c.json({
    ok: true,
    book: toBookResponse(restored.book, restored.notes),
  });
});

// 本と履歴を完全削除
booksApp.delete("/:id/permanent", async (c) => {
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
