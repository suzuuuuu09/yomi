# データベーススキーマ設計

- Cloudflare D1
- Drizzle ORM
- Better Auth（Google OAuth + セッション管理を自動管理）

---

## ER図

```
users 1--N sessions
users 1--N accounts
users 1--N books
users 1--N reading_notes
users 1--N reading_logs
books 1--N reading_notes
books 1--N reading_logs

verifications（外部キーなし）
```

---

## テーブル定義

### Better Auth 管理テーブル

Better Auth の Drizzle アダプターが利用するテーブル。定義は `src/server/schemas/db.ts`、作成・更新は `drizzle/` のマイグレーションで管理する。以下は実際のSQLテーブル名・保存型を示す。

#### `users` — ユーザー

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | Better Auth が自動生成 |
| `name` | TEXT | NOT NULL | 表示名 |
| `email` | TEXT | UNIQUE NOT NULL | メールアドレス |
| `emailVerified` | INTEGER | NOT NULL DEFAULT 0 | メール検証済みフラグ |
| `image` | TEXT | | アバター画像URL |
| `reading_timezone` | TEXT | | 読書日の境界に使うIANAタイムゾーン（未設定可） |
| `reading_day_offset` | INTEGER | NOT NULL DEFAULT 0 | タイムゾーン変更後も連続する論理読書日の補正値 |
| `reading_timezone_revision` | INTEGER | NOT NULL DEFAULT 0 | タイムゾーン設定の世代番号 |
| `createdAt` | INTEGER | NOT NULL DEFAULT (unixepoch()) | Unix秒 |
| `updatedAt` | INTEGER | NOT NULL DEFAULT (unixepoch()) | Unix秒 |

#### `sessions` — セッション

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | セッションID |
| `expiresAt` | INTEGER | NOT NULL | 有効期限（Unix秒） |
| `token` | TEXT | UNIQUE NOT NULL | セッショントークン（Cookie に保存） |
| `createdAt` | INTEGER | NOT NULL DEFAULT (unixepoch()) | Unix秒 |
| `updatedAt` | INTEGER | NOT NULL DEFAULT (unixepoch()) | Unix秒 |
| `ipAddress` | TEXT | | クライアントIPアドレス |
| `userAgent` | TEXT | | User-Agent |
| `userId` | TEXT | NOT NULL, FK → users.id ON DELETE CASCADE | セッション所有ユーザー |

#### `accounts` — OAuth アカウント連携

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | アカウントID |
| `accountId` | TEXT | NOT NULL | プロバイダ側のユーザーID (Google `sub`) |
| `providerId` | TEXT | NOT NULL | プロバイダ名 (`google`) |
| `userId` | TEXT | NOT NULL, FK → users.id ON DELETE CASCADE | 紐付くユーザー |
| `accessToken` | TEXT | | アクセストークン |
| `refreshToken` | TEXT | | リフレッシュトークン |
| `idToken` | TEXT | | IDトークン |
| `accessTokenExpiresAt` | INTEGER | | アクセストークン有効期限（Unix秒） |
| `refreshTokenExpiresAt` | INTEGER | | リフレッシュトークン有効期限（Unix秒） |
| `scope` | TEXT | | 付与されたスコープ |
| `password` | TEXT | | パスワード（ソーシャルログインでは未使用） |
| `createdAt` | INTEGER | NOT NULL DEFAULT (unixepoch()) | Unix秒 |
| `updatedAt` | INTEGER | NOT NULL DEFAULT (unixepoch()) | Unix秒 |

#### `verifications` — メール検証トークン等

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | 検証ID |
| `identifier` | TEXT | NOT NULL | 検証対象の識別子 |
| `value` | TEXT | NOT NULL | トークン値 |
| `expiresAt` | INTEGER | NOT NULL | 有効期限（Unix秒） |
| `createdAt` | INTEGER | | Unix秒 |
| `updatedAt` | INTEGER | | Unix秒 |

**備考**: 日時のINTEGERは Drizzle の `mode: "timestamp"` で `Date` と相互変換する。書籍・ノート・読書ログの日時はTEXT（ISO 8601）で保存する。

---

### アプリケーション固有テーブル

以下のテーブルも Drizzle ORM のスキーマとマイグレーションで管理する。`users.id` を外部キーとして参照する。

---

### `books` — 本（星）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | UUID（`crypto.randomUUID()`） |
| `user_id` | TEXT | NOT NULL, FK → users.id ON DELETE CASCADE | 所有ユーザー |
| `title` | TEXT | NOT NULL | 本のタイトル |
| `author` | TEXT | NOT NULL DEFAULT '' | 著者名 |
| `isbn` | TEXT | DEFAULT '' | ISBN（検索ではISBN-13優先、ISBN-10も可） |
| `total_pages` | INTEGER | NOT NULL DEFAULT 0 | 総ページ数 |
| `current_page` | INTEGER | NOT NULL DEFAULT 0 | 現在の読書ページ |
| `status` | TEXT | NOT NULL DEFAULT 'unread' | 'unread' \| 'reading' \| 'completed' |
| `genre` | TEXT | NOT NULL DEFAULT '' | ジャンル（星座クラスタの基準） |
| `cover_url` | TEXT | DEFAULT '' | 書影URL（Google Books API等から取得） |
| `position_x` | REAL | NOT NULL DEFAULT 0 | 3D座標X（APIが計算） |
| `position_y` | REAL | NOT NULL DEFAULT 0 | 3D座標Y（APIが計算） |
| `position_z` | REAL | NOT NULL DEFAULT 0 | 3D座標Z（APIが計算） |
| `brightness` | REAL | NOT NULL DEFAULT 0.15 | 星の明るさ（API計算値は0.15〜0.9） |
| `color` | TEXT | NOT NULL DEFAULT '#FFFFFF' | 星の色 (HEXまたはHSL) |
| `registered_at` | TEXT | NOT NULL | 登録日 (ISO 8601) |
| `completed_at` | TEXT | | 読了日 (nullable, ISO 8601) |
| `archived_at` | TEXT | | アーカイブ日時 (nullable, ISO 8601) |
| `created_at` | TEXT | NOT NULL | ISO 8601 |
| `updated_at` | TEXT | NOT NULL | ISO 8601 |

**インデックス**: `user_id`, `(user_id, status)`, `(user_id, genre)`, `(user_id, current_page)`, `(user_id, total_pages)`, `(user_id, archived_at)`

**備考**:

- `position_x/y/z`, `brightness`, `color` はAPI側で計算してDBに保存（[star-formation.md](./star-formation.md) 参照）
- `status` は作成・進捗更新・総ページ数変更時にページ数から算出（0→unread、総ページ数が既知で到達→completed、それ以外→reading）。総ページ数0は不明扱い
- CHECK制約: ページ数は0以上、総ページ数が既知なら現在ページは総ページ数以下、statusは3種類に限定

---

### `reading_notes` — 読書メモ

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | UUID（`crypto.randomUUID()`） |
| `book_id` | TEXT | NOT NULL, FK → books.id ON DELETE CASCADE | 紐付く本 |
| `user_id` | TEXT | NOT NULL, FK → users.id ON DELETE CASCADE | 所有ユーザー（非正規化、クエリ効率のため） |
| `content` | TEXT | NOT NULL | メモ本文 |
| `page` | INTEGER | | 紐付くページ番号 (nullable) |
| `created_at` | TEXT | NOT NULL | ISO 8601 |

**インデックス**: `book_id`, `user_id`

**CHECK制約**: `page >= 1 OR page IS NULL`

---

### `reading_logs` — 読書ログ（日別ページ記録）

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | TEXT | PK | UUID（`crypto.randomUUID()`） |
| `book_id` | TEXT | NOT NULL, FK → books.id ON DELETE CASCADE | 紐付く本 |
| `user_id` | TEXT | NOT NULL, FK → users.id ON DELETE CASCADE | 所有ユーザー |
| `pages_read` | INTEGER | NOT NULL | その日に読んだページ数 |
| `date` | TEXT | NOT NULL | 記録日 (YYYY-MM-DD) |
| `reading_day` | INTEGER | | タイムゾーン変更をまたいでも不変な論理読書日番号 |
| `reading_timezone_revision` | INTEGER | NOT NULL DEFAULT 0 | 記録時のタイムゾーン設定世代 |
| `created_at` | TEXT | NOT NULL | ISO 8601 |

**インデックス**: `(book_id, reading_timezone_revision, date)` UNIQUE（設定世代と表示日ごとに1レコード）, `(user_id, date)`, `(user_id, book_id)`

**CHECK制約**: `pages_read >= 1`（0ページは行を削除）

**備考**:

- 進捗の増加分は、記録時の設定世代と表示日の組み合わせへ `UPSERT` で加算
- 進捗を戻す場合は同じ本の当日の論理読書日のログから減算し、0になる行を削除する。過去の論理読書日は変更しない
- Reading Graph（過去14日）の描画に使用
- `date` は記録時のタイムゾーンで表示する日付として保持し、タイムゾーン変更後も再計算しない
- 統計では複数世代のログを `reading_day` で合算する

---

## 星座線 (constellation_lines) について

星座の線はテーブルに保存せず、APIがアーカイブされていない本から動的に計算する。クライアントでも同じ関数を使い、ローカルの書籍更新時に再計算する。
条件（[star-formation.md](./star-formation.md) より）:

```
1. 両方の status === 'completed'
2. 同じ空でない genre
3. 3D距離 < 4.0
```

実装は `src/server/lib/star-formation.ts` の関数で計算する。以下は同じ条件をSQLで表した参考例:

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
  AND b1.genre <> ''
  AND b1.archived_at IS NULL
  AND b2.archived_at IS NULL
  AND (
    (b1.position_x - b2.position_x) * (b1.position_x - b2.position_x)
  + (b1.position_y - b2.position_y) * (b1.position_y - b2.position_y)
  + (b1.position_z - b2.position_z) * (b1.position_z - b2.position_z)
  ) < 16.0;  -- 4.0^2 = 16.0
```

---

## 認証フロー

Better Auth が `/api/auth/*` エンドポイントで自動管理する。詳細は [api.md](./api.md) を参照。

ログイン画面の `signIn.social({ provider: "google", callbackURL: "/app" })` から認証を開始し、Googleのコールバック処理後に `/app` へ戻る。

---

## マイグレーション

認証用・アプリケーション用の全テーブルを次のSQLで順に作成・更新する。アプリ起動時の自動適用や、独自の `POST /migrate` エンドポイントはない。

| ファイル | 内容 |
|---|---|
| [0000_superb_penance.sql](../drizzle/0000_superb_penance.sql) | 全7テーブル、インデックス、CHECK制約の作成 |
| [0001_reading_log_settings.sql](../drizzle/0001_reading_log_settings.sql) | 読書タイムゾーンとアーカイブ日時の追加 |
| [0002_strong_human_robot.sql](../drizzle/0002_strong_human_robot.sql) | 論理読書日・設定世代の追加、既存ログの補完、一意インデックスの変更 |

開発用D1への適用と必要カラムの確認:

```bash
pnpm db:migrate:local
pnpm db:check-schema:local
```

共有・本番D1への適用は `pnpm db:migrate:remote` を使う。対象を確認して実行する。
`scripts/migrate-d1.sh` は、SQLファイルで初期化した既存DBのスキーマを確認し、適用済みの移行履歴を補完してから未適用分を適用する。詳細は [README](../README.md#開発) を参照。
