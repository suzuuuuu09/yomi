# データベーススキーマ設計

- Cloudflare D1
- Drizzle ORM
- Better Auth（Google OAuth + セッション管理を自動管理）

---

## ER図

```
user 1--N session
user 1--N account
user 1--N verification
user 1--N books
books 1--N reading_notes
books 1--N reading_logs
```

---

## テーブル定義

### Better Auth 管理テーブル

Better Auth が自動的にマイグレーション・管理するテーブル。手動でのスキーマ変更は不要。

#### `user` — ユーザー

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | Better Auth が自動生成 |
| `name` | TEXT | NOT NULL | 表示名 |
| `email` | TEXT | UNIQUE NOT NULL | メールアドレス |
| `emailVerified` | INTEGER | NOT NULL DEFAULT 0 | メール検証済みフラグ |
| `image` | TEXT | | アバター画像URL |
| `createdAt` | TEXT | NOT NULL | ISO 8601 |
| `updatedAt` | TEXT | NOT NULL | ISO 8601 |

#### `session` — セッション

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | セッションID |
| `expiresAt` | TEXT | NOT NULL | 有効期限 (ISO 8601) |
| `token` | TEXT | UNIQUE NOT NULL | セッショントークン（Cookie に保存） |
| `createdAt` | TEXT | NOT NULL | ISO 8601 |
| `updatedAt` | TEXT | NOT NULL | ISO 8601 |
| `ipAddress` | TEXT | | クライアントIPアドレス |
| `userAgent` | TEXT | | User-Agent |
| `userId` | TEXT | NOT NULL, FK → user.id | セッション所有ユーザー |

#### `account` — OAuth アカウント連携

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | アカウントID |
| `accountId` | TEXT | NOT NULL | プロバイダ側のユーザーID (Google `sub`) |
| `providerId` | TEXT | NOT NULL | プロバイダ名 (`google`) |
| `userId` | TEXT | NOT NULL, FK → user.id | 紐付くユーザー |
| `accessToken` | TEXT | | アクセストークン |
| `refreshToken` | TEXT | | リフレッシュトークン |
| `idToken` | TEXT | | IDトークン |
| `accessTokenExpiresAt` | TEXT | | アクセストークン有効期限 |
| `refreshTokenExpiresAt` | TEXT | | リフレッシュトークン有効期限 |
| `scope` | TEXT | | 付与されたスコープ |
| `password` | TEXT | | パスワード（ソーシャルログインでは未使用） |
| `createdAt` | TEXT | NOT NULL | ISO 8601 |
| `updatedAt` | TEXT | NOT NULL | ISO 8601 |

#### `verification` — メール検証トークン等

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | 検証ID |
| `identifier` | TEXT | NOT NULL | 検証対象の識別子 |
| `value` | TEXT | NOT NULL | トークン値 |
| `expiresAt` | TEXT | NOT NULL | 有効期限 |
| `createdAt` | TEXT | | ISO 8601 |
| `updatedAt` | TEXT | | ISO 8601 |

**備考**: これらのテーブルは Better Auth のマイグレーション機能（`getMigrations`）で自動作成される。

---

### アプリケーション固有テーブル

以下のテーブルは Drizzle ORM で手動管理する。`user.id` を外部キーとして参照する。

---

### `books` — 本（星）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | ULID or UUID |
| `user_id` | TEXT | NOT NULL, FK → user.id ON DELETE CASCADE | 所有ユーザー |
| `title` | TEXT | NOT NULL | 本のタイトル |
| `author` | TEXT | NOT NULL DEFAULT '' | 著者名 |
| `isbn` | TEXT | DEFAULT '' | ISBN-13 |
| `total_pages` | INTEGER | NOT NULL DEFAULT 0 | 総ページ数 |
| `current_page` | INTEGER | NOT NULL DEFAULT 0 | 現在の読書ページ |
| `status` | TEXT | NOT NULL DEFAULT 'unread' | 'unread' \| 'reading' \| 'completed' |
| `genre` | TEXT | NOT NULL DEFAULT '' | ジャンル（星座クラスタの基準） |
| `cover_url` | TEXT | DEFAULT '' | 書影URL（Google Books API等から取得） |
| `position_x` | REAL | NOT NULL DEFAULT 0 | 3D座標X（APIが計算） |
| `position_y` | REAL | NOT NULL DEFAULT 0 | 3D座標Y（APIが計算） |
| `position_z` | REAL | NOT NULL DEFAULT 0 | 3D座標Z（APIが計算） |
| `brightness` | REAL | NOT NULL DEFAULT 0.15 | 星の明るさ (0.0〜1.0) |
| `color` | TEXT | NOT NULL DEFAULT '#FFFFFF' | 星の色 (HEXまたはHSL) |
| `registered_at` | TEXT | NOT NULL | 登録日 (ISO 8601) |
| `completed_at` | TEXT | | 読了日 (nullable, ISO 8601) |
| `created_at` | TEXT | NOT NULL | ISO 8601 |
| `updated_at` | TEXT | NOT NULL | ISO 8601 |

**インデックス**: `user_id`, `(user_id, status)`, `(user_id, genre)`

**備考**:
- `position_x/y/z`, `brightness`, `color` はAPI側で計算してDBに保存（[star-formation.md](./star-formation.md) 参照）
- `status` は `current_page` の変更に連動して自動更新（0→unread, 1〜total-1→reading, total→completed）

---

### `reading_notes` — 読書メモ

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | ULID or UUID |
| `book_id` | TEXT | NOT NULL, FK → books.id ON DELETE CASCADE | 紐付く本 |
| `user_id` | TEXT | NOT NULL, FK → user.id ON DELETE CASCADE | 所有ユーザー（非正規化、クエリ効率のため） |
| `content` | TEXT | NOT NULL | メモ本文 |
| `page` | INTEGER | | 紐付くページ番号 (nullable) |
| `created_at` | TEXT | NOT NULL | ISO 8601 |

**インデックス**: `book_id`, `user_id`

---

### `reading_logs` — 読書ログ（日別ページ記録）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | ULID or UUID |
| `book_id` | TEXT | NOT NULL, FK → books.id ON DELETE CASCADE | 紐付く本 |
| `user_id` | TEXT | NOT NULL, FK → user.id ON DELETE CASCADE | 所有ユーザー |
| `pages_read` | INTEGER | NOT NULL | その日に読んだページ数 |
| `date` | TEXT | NOT NULL | 記録日 (YYYY-MM-DD) |
| `created_at` | TEXT | NOT NULL | ISO 8601 |

**インデックス**: `(book_id, date)` UNIQUE（1日1レコードにUPSERT）, `(user_id, date)`

**備考**:
- +1Pやページ更新のたびに `UPSERT` で当日分を加算
- Reading Graph（過去14日）の描画に使用

---

## 星座線 (constellation_lines) について

星座の線はテーブルに保存せず、**APIが動的に計算**する。
条件（[star-formation.md](./star-formation.md) より）:

```
1. 両方の status === 'completed'
2. 同じ genre
3. 3D距離 < 4.0
```

D1 (SQLite) でのクエリ例:

```sql
SELECT b1.id AS from_id, b2.id AS to_id
FROM books b1
JOIN books b2
  ON b1.user_id = b2.user_id
 AND b1.id < b2.id
 AND b1.status = 'completed'
 AND b2.status = 'completed'
 AND b1.genre = b2.genre
WHERE b1.user_id = ?
  AND (
    (b1.position_x - b2.position_x) * (b1.position_x - b2.position_x)
  + (b1.position_y - b2.position_y) * (b1.position_y - b2.position_y)
  + (b1.position_z - b2.position_z) * (b1.position_z - b2.position_z)
  ) < 16.0;  -- 4.0^2 = 16.0
```

---

## 認証フロー

Better Auth が `/api/auth/*` エンドポイントで自動管理する。詳細は [api.md](./api.md) を参照。

```
[ブラウザ]                  [API (Hono + Better Auth)]    [Google]
    |                            |                        |
    |-- POST /api/auth/          |                        |
    |   sign-in/social --------->|                        |
    |                            |-- redirect ----------->|
    |                            |                        |
    |<-- redirect to consent ----|                        |
    |                            |                        |
    |-- (ユーザーが許可) ------->|                        |
    |                            |                        |
    |-- GET /api/auth/           |                        |
    |   callback/google?code= -->|                        |
    |                            |-- exchange code ------>|
    |                            |<-- tokens -------------|
    |                            |                        |
    |                            |-- upsert user (D1) ----|
    |                            |-- upsert account (D1) -|
    |                            |-- create session (D1) -|
    |                            |                        |
    |<-- Set-Cookie              |                        |
    |<-- redirect to /           |                        |
```

---

## マイグレーション

### Better Auth テーブル（自動マイグレーション）

Better Auth のテーブル（`user`, `session`, `account`, `verification`）は、
`POST /migrate` エンドポイントを呼び出すことで `getMigrations()` 経由で自動作成される。

### アプリケーションテーブル（手動マイグレーション）

```sql
-- 001_create_books.sql
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  isbn TEXT DEFAULT '',
  total_pages INTEGER NOT NULL DEFAULT 0,
  current_page INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unread',
  genre TEXT NOT NULL DEFAULT '',
  cover_url TEXT DEFAULT '',
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  position_z REAL NOT NULL DEFAULT 0,
  brightness REAL NOT NULL DEFAULT 0.15,
  color TEXT NOT NULL DEFAULT '#FFFFFF',
  registered_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_user_status ON books(user_id, status);
CREATE INDEX IF NOT EXISTS idx_books_user_genre ON books(user_id, genre);

-- 002_create_reading_notes.sql
CREATE TABLE IF NOT EXISTS reading_notes (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reading_notes_book_id ON reading_notes(book_id);

-- 003_create_reading_logs.sql
CREATE TABLE IF NOT EXISTS reading_logs (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  pages_read INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_logs_book_date ON reading_logs(book_id, date);
CREATE INDEX IF NOT EXISTS idx_reading_logs_user_date ON reading_logs(user_id, date);
```
