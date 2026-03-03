import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "@/server/middleware/auth";
import { getDBFromContext } from "@/server/lib/db";
import { books, readingNotes } from "@/server/schemas/db";
import type { AppEnv } from "@/server/types";

const booksApp = new OpenAPIHono<AppEnv>();

// 全ルートに認証ミドルウェアを適用
booksApp.use("/*", authMiddleware);

// ユーザーの本一覧を取得
booksApp.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const db = getDBFromContext();

  const userBooks = await db
    .select()
    .from(books)
    .where(eq(books.userId, user.id));

  // 各本のノートを取得
  const bookIds = userBooks.map((b) => b.id);
  type NoteRow = typeof readingNotes.$inferSelect;
  const notesByBookId: Record<string, NoteRow[]> = {};

  if (bookIds.length > 0) {
    const notesRows = await db
      .select()
      .from(readingNotes)
      .where(eq(readingNotes.userId, user.id));

    for (const note of notesRows) {
      if (!notesByBookId[note.bookId]) {
        notesByBookId[note.bookId] = [];
      }
      notesByBookId[note.bookId].push(note);
    }
  }

  const result = userBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn ?? "",
    totalPages: b.totalPages,
    currentPage: b.currentPage,
    status: b.status,
    genre: b.genre,
    coverUrl: b.coverUrl ?? "",
    registeredAt: b.registeredAt,
    completedAt: b.completedAt,
    position: [b.positionX, b.positionY, b.positionZ] as [
      number,
      number,
      number,
    ],
    brightness: b.brightness,
    color: b.color,
    notes: (notesByBookId[b.id] ?? []).map((n) => ({
      id: n.id,
      content: n.content,
      page: n.page,
      createdAt: n.createdAt,
    })),
  }));

  return c.json(result);
});

// 本を追加
booksApp.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const db = getDBFromContext();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(books).values({
    id,
    userId: user.id,
    title: body.title ?? "",
    author: body.author ?? "",
    isbn: body.isbn ?? "",
    totalPages: body.totalPages ?? 0,
    currentPage: body.currentPage ?? 0,
    status: body.status ?? "unread",
    genre: body.genre ?? "",
    coverUrl: body.coverUrl ?? "",
    positionX: body.position?.[0] ?? (Math.random() - 0.5) * 10,
    positionY: body.position?.[1] ?? (Math.random() - 0.5) * 8,
    positionZ: body.position?.[2] ?? (Math.random() - 0.5) * 10,
    brightness: body.brightness ?? 0.7 + Math.random() * 0.3,
    color: body.color ?? "#818cf8",
    registeredAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ id }, 201);
});

// PUT /api/books/:id — 本を更新
booksApp.put("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const bookId = c.req.param("id");
  const body = await c.req.json();
  const db = getDBFromContext();
  const now = new Date().toISOString();

  // ユーザー所有の本か確認
  const existing = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "本が見つかりません" }, 404);
  }

  // 更新可能なフィールドのみ抽出
  const updates: Record<string, unknown> = { updatedAt: now };
  if (body.title !== undefined) updates.title = body.title;
  if (body.author !== undefined) updates.author = body.author;
  if (body.isbn !== undefined) updates.isbn = body.isbn;
  if (body.totalPages !== undefined) updates.totalPages = body.totalPages;
  if (body.currentPage !== undefined) updates.currentPage = body.currentPage;
  if (body.status !== undefined) updates.status = body.status;
  if (body.genre !== undefined) updates.genre = body.genre;
  if (body.coverUrl !== undefined) updates.coverUrl = body.coverUrl;
  if (body.position !== undefined) {
    updates.positionX = body.position[0];
    updates.positionY = body.position[1];
    updates.positionZ = body.position[2];
  }
  if (body.brightness !== undefined) updates.brightness = body.brightness;
  if (body.color !== undefined) updates.color = body.color;
  if (body.completedAt !== undefined) updates.completedAt = body.completedAt;

  await db
    .update(books)
    .set(updates)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  return c.json({ ok: true });
});

// 本を削除
booksApp.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const bookId = c.req.param("id");
  const db = getDBFromContext();

  const result = await db
    .delete(books)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)));

  return c.json({ ok: true });
});

// ノートの追加
booksApp.post("/:id/notes", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const bookId = c.req.param("id");
  const body = await c.req.json();
  const db = getDBFromContext();

  // ユーザー所有の本か確認
  const existing = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "本が見つかりません" }, 404);
  }

  const noteId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(readingNotes).values({
    id: noteId,
    bookId,
    userId: user.id,
    content: body.content ?? "",
    page: body.page ?? null,
    createdAt: now,
  });

  return c.json({ id: noteId }, 201);
});

// ノートを削除
booksApp.delete("/:bookId/notes/:noteId", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const noteId = c.req.param("noteId");
  const db = getDBFromContext();

  await db
    .delete(readingNotes)
    .where(and(eq(readingNotes.id, noteId), eq(readingNotes.userId, user.id)));

  return c.json({ ok: true });
});

export default booksApp;
