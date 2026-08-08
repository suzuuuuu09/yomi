# API設計書

## 共通仕様

- ベースURL: アプリと同一オリジンの`/api`（ローカル: `http://localhost:3000/api`）
- レスポンス形式: `application/json`
- 認証方式: Cookie ベースのセッション認証
- OpenAPI ドキュメント: `GET /api/openapi.json`
- Swagger UI: `GET /api/docs`

### エラーレスポンス

APIが返すエラーは以下の形式で統一する。

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "入力値が不正です",
    "issues": [{ "path": ["title"], "message": "必須です" }]
  }
}
```

| ステータス | code | 説明 |
|---|---|---|
| 400 | `INVALID_REQUEST` | リクエストパラメータ不正 |
| 401 | `UNAUTHORIZED` | 未認証（セッションなし or 期限切れ） |
| 404 | `NOT_FOUND` | リソースが見つからない |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |
| 502 | `UPSTREAM_ERROR` | Google Books APIの障害または不正応答 |
| 504 | `UPSTREAM_TIMEOUT` | Google Books APIのタイムアウト |

---

## 認証 (`/api/auth`)

### 概要

- **ライブラリ**: [Better Auth](https://www.better-auth.com/) — フレームワーク非依存の認証ライブラリ
- **Hono 統合**: `auth.handler(c.req.raw)` を `/api/auth/*` にマウント
- **DB**: Cloudflare D1（Better Auth がテーブルを自動管理）
- **プロバイダ**: Google OAuth 2.0（`socialProviders.google`）
- **セッション管理**: Better Auth が Cookie ベースで自動管理

### アーキテクチャ

Better Auth はすべての認証フロー（OAuth リダイレクト、コールバック、トークン交換、セッション管理）を内部で処理する。
手動で state / code_verifier / Cookie を管理する必要はない。

```
[ブラウザ]                   [API (Hono)]                   [Google]
    |                             |                              |
    |-- POST /api/auth/           |                              |
    |   sign-in/social ---------->|                              |
    |   { provider: "google" }    |                              |
    |                             |-- Better Auth が自動で        |
    |                             |   state 生成 + redirect ----->|
    |                             |                              |
    |<-- 302 redirect to Google --|                              |
    |                             |                              |
    |-- (ユーザーが Google で許可) ------------------------------>|
    |                             |                              |
    |<-- 302 redirect (code) ----|-------------------------------|
    |                             |                              |
    |-- GET /api/auth/            |                              |
    |   callback/google?code= --->|                              |
    |                             |-- Better Auth が自動で        |
    |                             |   code → token 交換 -------->|
    |                             |<-- tokens -------------------|
    |                             |                              |
    |                             |-- user upsert (D1)           |
    |                             |-- account upsert (D1)        |
    |                             |-- session 作成 (D1)           |
    |                             |                              |
    |<-- Set-Cookie: better-auth  |                              |
    |<-- 302 redirect to /app     |                              |
```

---

### Better Auth が自動提供するエンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/auth/sign-in/social` | ソーシャルログイン開始 (`{ provider: "google", callbackURL: "/app" }`) |
| GET | `/api/auth/callback/google` | Google OAuth コールバック（自動処理） |
| GET | `/api/auth/get-session` | 現在のセッション・ユーザー情報取得 |
| POST | `/api/auth/sign-out` | ログアウト（セッション破棄） |

#### `POST /api/auth/sign-in/social`

**リクエストボディ:**

```json
{
  "provider": "google",
  "callbackURL": "/app"
}
```

**レスポンス:** 302 → Google 認証画面

#### `GET /api/auth/get-session`

**レスポンス (200 OK):**

```json
{
  "session": {
    "id": "abc123...",
    "userId": "user_xxx...",
    "token": "...",
    "expiresAt": "2026-03-28T09:00:00.000Z"
  },
  "user": {
    "id": "user_xxx...",
    "name": "山田太郎",
    "email": "user@example.com",
    "image": "https://lh3.googleusercontent.com/..."
  }
}
```

**レスポンス (401):** セッションなしまたは期限切れ

#### `POST /api/auth/sign-out`

**レスポンス (200 OK):** セッション Cookie 削除

---

### 認証ミドルウェア

🔒 マークのついたエンドポイントはすべて認証ミドルウェアを通過する。

Better Auth の `auth.api.getSession()` を使用して、リクエストヘッダーからセッションを検証する。

```ts
// src/middleware/auth.ts
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});
```

#### 型定義

```ts
type AppEnv = {
  Bindings: {
    yomi_db: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    FRONTEND_URL: string;
    GOOGLE_API_KEY: string;
  };
  Variables: {
    user: BetterAuthUser | null;
    session: BetterAuthSession | null;
  };
};
```

---

## 環境変数・シークレット

認証に必要な環境変数（`.dev.vars` / Cloudflare Secrets）:

| 変数名 | 説明 |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `BETTER_AUTH_SECRET` | Better Auth のセッション署名用シークレット（ランダム文字列） |
| `BETTER_AUTH_URL` | Better Authが動作するアプリの公開URL（例: `https://yomi.suzuuuuu09.com`） |
| `FRONTEND_URL` | フロントエンドのURL（OAuth後のリダイレクト先） |

---

## エンドポイント

### 本の検索 (`GET /api/search`)

ログイン済みセッションが必要です。匿名リクエストは`401 UNAUTHORIZED`になります。

クエリパラメータ:
- `q` (条件付き必須): 検索キーワード（最大200文字）
- `isbn` (条件付き必須): ISBNコードでの検索（`q` と同時指定時は `isbn` 優先）
- `index` (任意): 結果の開始位置（0以上の整数、デフォルト: 0）
- `results` (任意): 返却する結果の最大数（1〜40の整数、デフォルト: 10）

`q`と`isbn`の少なくとも一方を指定してください。上流障害時は502、タイムアウト時は504を返します。

OpenAPIドキュメントには現在、スキーマ定義済みの検索エンドポイントが登録されています。本の管理エンドポイントはこの文書の下記一覧を参照してください。

#### レスポンス

**200 OK**

```json
{
  "totalItems": 1,
  "books": [
    {
      "id": "zT3GEAAAQBAJ",
      "title": "TypeScript入門",
      "authors": ["山田太郎"],
      "publisher": "技術評論社",
      "publishedDate": "2025-01-01",
      "description": "...",
      "isbn": "9784000000000",
      "page": 320,
      "thumbnail": "https://..."
    }
  ]
}
```

### 本 (`/api/books`)

すべてのエンドポイントでログイン済みセッションが必要です。書籍の作成・編集・ノート作成では入力スキーマを検証し、失敗時は`400 INVALID_REQUEST`を返します。

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/books` | 自分の書籍と星座線を取得 |
| POST | `/api/books` | 書籍を作成。作成後の完全な`book`を返す |
| PUT | `/api/books/:id` | 書誌情報を更新。更新後の完全な`book`を返す |
| POST | `/api/books/:id/progress` | `{ "delta": 1 }`または`{ "page": 42 }`で進捗を更新。更新後の完全な`book`を返す |
| DELETE | `/api/books/:id` | 自分の書籍を削除 |
| POST | `/api/books/:id/notes` | ノートを作成 |
| DELETE | `/api/books/:bookId/notes/:noteId` | 指定した書籍に属する自分のノートを削除 |

`delta`による現在ページの加算は、複数タブから同時に送信されてもサーバー側で原子的に適用されます。`page`を指定する場合、`totalPages`が0より大きければ総ページ数を超える値は`400 INVALID_REQUEST`になります。`totalPages`が0の場合は総ページ数不明として上限を設けません。
