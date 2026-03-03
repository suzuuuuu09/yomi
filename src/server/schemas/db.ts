import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ╭─────────────────────────────────────────────────────────╮
// │                   認証関連のテーブル                    │
// ╰─────────────────────────────────────────────────────────╯

// ユーザー情報
export const user = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// セッション情報
export const session = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// OAuthなどのアカウント情報
export const account = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// 認証コードやパスワードリセットなどの一時的なトークン
export const verification = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

// ╭─────────────────────────────────────────────────────────╮
// │             アプリケーション関連のテーブル              │
// ╰─────────────────────────────────────────────────────────╯

// 本の情報
export const books = sqliteTable(
  "books",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author").notNull().default(""),
    isbn: text("isbn").default(""),
    totalPages: integer("total_pages").notNull().default(0),
    currentPage: integer("current_page").notNull().default(0),
    status: text("status").notNull().default("unread"),
    genre: text("genre").notNull().default(""),
    coverUrl: text("cover_url").default(""),
    positionX: real("position_x").notNull().default(0),
    positionY: real("position_y").notNull().default(0),
    positionZ: real("position_z").notNull().default(0),
    brightness: real("brightness").notNull().default(0.15),
    color: text("color").notNull().default("#FFFFFF"),
    registeredAt: text("registered_at").notNull(),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_books_user_id").on(table.userId),
    index("idx_books_user_status").on(table.userId, table.status),
    index("idx_books_user_genre").on(table.userId, table.genre),
  ],
);

// 読書ノート
export const readingNotes = sqliteTable(
  "reading_notes",
  {
    id: text("id").primaryKey(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    page: integer("page"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_reading_notes_book_id").on(table.bookId),
    index("idx_reading_notes_user_id").on(table.userId),
  ],
);

// 読書ログ
export const readingLogs = sqliteTable(
  "reading_logs",
  {
    id: text("id").primaryKey(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pagesRead: integer("pages_read").notNull(),
    date: text("date").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_reading_logs_book_date").on(table.bookId, table.date),
    index("idx_reading_logs_user_date").on(table.userId, table.date),
  ],
);
