# API設計書

## 共通仕様

- ベースURL: アプリと同一オリジンの`/api`（ローカル: `http://localhost:3000/api`）
- 業務APIのレスポンス形式: `application/json`（`GET /api/` はテキスト、`GET /api/docs` はHTML）
- 認証方式: Cookie ベースのセッション認証
- `GET /api/search` は認証不要。蔵書・読書ログ・ゲスト記録の引き継ぎには認証が必要。
- OpenAPI ドキュメント: `GET /api/openapi.json`
- Swagger UI: `GET /api/docs`

### エラーレスポンス

検索・書籍・読書ログAPIおよび認証ミドルウェアが返すエラーは以下の形式を使う。`issues` は入力検証の詳細がある場合のみ含む。`/api/auth/*` の応答はBetter Authの形式に従う。

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
| 409 | `CONFLICT` | アカウント・設定が変更されたため再試行が必要 |
| 413 | `INVALID_REQUEST` | 引き継ぎリクエストが大きすぎる |
| 429 | `RATE_LIMITED` | 検索回数の上限。`Retry-After: 60` |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |
| 502 | `UPSTREAM_ERROR` | Google Books APIの障害または不正応答 |
| 504 | `UPSTREAM_TIMEOUT` | Google Books APIのタイムアウト |

---

## 認証 (`/api/auth`)

### 概要

- **ライブラリ**: [Better Auth](https://www.better-auth.com/) — フレームワーク非依存の認証ライブラリ
- **Hono 統合**: `auth.handler(c.req.raw)` を `/api/auth/*` にマウント
- **DB**: Cloudflare D1 + Drizzleアダプター（スキーマ・マイグレーションはリポジトリで管理）
- **プロバイダ**: Google OAuth 2.0（`socialProviders.google`）
- **セッション管理**: Better Auth が Cookie ベースで管理。有効期間30日、Cookieキャッシュ5分

### アーキテクチャ

Better Auth はすべての認証フロー（OAuth リダイレクト、コールバック、トークン交換、セッション管理）を内部で処理する。
手動で state / code_verifier / Cookie を管理する必要はない。

1. ログイン画面が `POST /api/auth/sign-in/social` にGoogleプロバイダと `callbackURL: "/app"` を送る。
2. Better Authがstate・code verifierと認証URLを生成し、200で `{ url, redirect }` を返す。
3. Better AuthクライアントがGoogleの認証画面へ遷移する。
4. 許可後、Googleから `/api/auth/callback/google` へ戻る。
5. Better Authがトークンを交換し、D1のユーザー・アカウント・セッションを保存する。
6. セッションCookieを設定し、`/app` へリダイレクトする。

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

**レスポンス (200 OK):** `{ "url": "https://accounts.google.com/...", "redirect": true }`。Better Authクライアントが返されたURLへ遷移する。

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

**セッションなし・期限切れ:** 通常は `200 OK` で `null` を返す。保護対象の業務APIにアクセスした場合は認証ミドルウェアが `401 UNAUTHORIZED` を返す。

#### `POST /api/auth/sign-out`

**レスポンス (200 OK):** セッション Cookie 削除

---

### 認証ミドルウェア

書籍・読書ログ・ゲスト記録の引き継ぎに `src/server/middleware/auth.ts` の `authMiddleware` を適用する。Better Auth の `auth.api.getSession({ headers: c.req.raw.headers })` でセッションを検証し、有効なら `user` と `session` をコンテキストへ設定する。検索は認証不要だが、サーバー側で回数を制限する。

セッションがなければ `401 UNAUTHORIZED`、認証サービスの例外は `500 INTERNAL_ERROR` を返す。認証エンドポイント・OpenAPI・Swagger UIにはこのミドルウェアを適用しない。

内部の型定義は [`src/server/types.ts`](../src/server/types.ts) を参照。

---

## 環境変数・シークレット

実装が参照する設定は以下のとおり。認証設定は `cloudflare:workers` の `env`、Honoの環境、`process.env` の順に参照する。開発・プレビュー・本番ともCloudflare Workersのランタイムを使い、D1は同じ `env.yomi_db` から取得する。

| 変数名 | 説明 |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `BETTER_AUTH_SECRET` | Better Auth のセッション署名用シークレット（ランダム文字列） |
| `BETTER_AUTH_URL` | Better Authが動作するアプリの公開URL（例: `https://yomi.suzuuuuu09.com`） |
| `GOOGLE_API_KEY` | Google Books APIのキー。検索ルートは `process.env.GOOGLE_API_KEY` を参照 |

`BETTER_AUTH_URL` 未設定時はリクエストのオリジンを使う。D1バインディング `yomi_db` は必須。
`FRONTEND_URL` は型に定義されているが、現在の認証処理では参照しない。OAuth後の遷移先はログイン画面が指定する `callbackURL: "/app"`。

---

## エンドポイント

### 本の検索 (`GET /api/search`)

認証不要。検索語・ISBNはサーバー経由でGoogle Booksへ送信する。D1上のカウンターで、接続元ごとに30回/分、アプリ全体で300回/分を上限とする。ログイン利用者も同じ上限を適用し、上限に達した場合は外部APIを呼ばず`429 RATE_LIMITED`と`Retry-After: 60`を返す。接続元にはCloudflareの`CF-Connecting-IP`をハッシュ化した値を使い、ローカルでは共通のカウンターを使う。D1が利用できなければ検索も失敗し、制限を迂回して呼び出さない。

クエリパラメータ:

- `q` (条件付き必須): 検索キーワード（最大200文字）
- `isbn` (条件付き必須): 数字・X/x・スペース・ハイフンからなる10〜17文字（`q` と同時指定時は `isbn` 優先）
- `index` (任意): 結果の開始位置（0以上の整数、デフォルト: 0）
- `results` (任意): 返却する結果の最大数（1〜40の整数、デフォルト: 10）

`q`と`isbn`の少なくとも一方を指定してください。文字列の前後の空白は除去します。上流障害・不正応答時は502、5秒のタイムアウト時は504を返します。上流に `items` がない場合はレスポンスの `books` も省略されます。

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
| DELETE | `/api/books/:id` | 自分の書籍をアーカイブ。読書履歴は保持する |
| POST | `/api/books/:id/archive` | 書籍をアーカイブ |
| POST | `/api/books/:id/restore` | アーカイブ済み書籍を復元 |
| GET | `/api/books/archived` | アーカイブ済み書籍を取得 |
| DELETE | `/api/books/:id/permanent` | 書籍、ノート、読書ログを完全削除 |
| POST | `/api/books/:id/notes` | ノートを作成 |
| DELETE | `/api/books/:bookId/notes/:noteId` | 指定した書籍に属する自分のノートを削除 |

`delta` と `page` はどちらか一方だけを指定します。`delta` は -1,000,000〜1,000,000 の整数で、結果は0以上、総ページ数が既知ならその範囲内に丸めます。`delta`による更新は比較更新と再試行で競合を処理し、書籍と読書ログをD1のバッチでまとめて適用します。競合の再試行は最大5回で、解消できなければ500を返します。書誌編集も更新前の値を比較し、競合時は最新のページ数から状態を再計算します。`page`を指定する場合、`totalPages`が0より大きければ総ページ数を超える値は`400 INVALID_REQUEST`になります。`totalPages`が0の場合は総ページ数による上限を設けません（`page` 自体の入力上限は1,000,000）。

#### 書籍・ノートの入力と応答

- 作成: `title` 必須（空白除去後1〜200文字）。`author` は200文字、`isbn` は32文字、`genre` は100文字、`coverUrl` は2,048文字まで。省略した文字列は空文字、ページ数は0。
- ページ数: `totalPages`・`currentPage`・進捗の `page` は0〜1,000,000の整数。総ページ数0は不明扱い。状態はページ数から算出し、作成時に `status` を送っても状態指定には使わない。
- 書誌編集: `title`・`author`・`isbn`・`totalPages`・`genre`・`coverUrl` のいずれか1項目以上。現在ページを変える場合は進捗APIを使う。
- ノート作成: `content` は空白除去後1〜10,000文字。`page` は1〜1,000,000の整数、nullまたは省略可。成功時は201で `{ "id": "..." }` を返す。
- 書籍の作成は201、編集・進捗更新・復元は200で `book` を返す。`book` は書誌情報、状態、`registeredAt`・`completedAt`・`archivedAt`、`position: [x, y, z]`、`brightness`、`color`、`notes` を含む（`src/server/lib/book-response.ts`）。
- 一覧は `{ books, constellationLines }`、アーカイブ一覧は `{ books }`。星座線は進捗更新の応答には含めず、クライアント側でも再計算する。
- アーカイブ・完全削除・ノート削除の成功応答は200で `{ "ok": true }`。アーカイブしてもノート・読書ログと統計への寄与は保持し、完全削除では関連ノート・読書ログも削除する。
- 書誌編集・進捗更新はアーカイブ済みの本を対象にすると404。ノート操作・読書ログ操作・完全削除はアーカイブ済みの本も対象にできる。

### 読書ログ (`/api/reading-logs`)

すべて認証必須。操作できるのは自分の本のログのみ。

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/reading-logs` | 全冊を集計した過去14日の読書量、連続読書日数、タイムゾーンを取得 |
| GET | `/api/reading-logs/:bookId` | 本ごとの日別読書ログを取得 |
| PUT | `/api/reading-logs/:bookId/:date` | 対象日をページ数で明示的に訂正。`pagesRead: 0`は削除。複数世代が同じ表示日にある場合は`readingDay`と`readingTimezoneRevision`を指定 |
| DELETE | `/api/reading-logs/:bookId/:date?readingDay=...&readingTimezoneRevision=...` | 対象日の読書ログを削除。複数世代が同じ表示日にある場合は論理読書日と設定世代を指定 |
| GET | `/api/reading-logs/settings` | 保存済みの読書タイムゾーンを取得 |
| PUT | `/api/reading-logs/settings` | IANAタイムゾーンを保存 |

進捗更新時は保存済みタイムゾーンで暦日を決定し、同じ本と論理読書日のページ量へ増減を反映します。
クライアントは本一覧の取得時に、設定がなければブラウザで検出したタイムゾーンを設定APIへ保存します。
保存済みタイムゾーンがない初回の進捗更新では、クライアントが検出した有効なIANAタイムゾーンをリクエストの`readingTimezone`として必ず指定し、その値を初期値として保存します。値がない場合は`400 INVALID_REQUEST`になります。
既存ログの日付はタイムゾーン変更後も再集計しません。
タイムゾーン変更時は論理読書日の連続性を保つための補正値と設定世代だけを更新し、既存ログの`date`と`readingDay`は変更しません。新しい世代のログは既存世代と別レコードに保存し、統計では論理読書日単位に合算します。Reading Graphの棒ラベルは現在の読書タイムゾーンの論理日軸から生成します。

進捗を戻す場合は、同じ本の当日の論理読書日のログから減算し、0になる行を削除します。過去日のログには遡りません。ログの明示的な訂正・削除は本の `currentPage` を変更しません。

- 統計: `{ days: [{ date, pagesRead, readingDay }], streak, readingTimezone }`。アーカイブ済みを含む全冊を合算し、過去14日は記録のない日を0で埋めます。タイムゾーン未設定なら `{ days: [], streak: 0, readingTimezone: null }`。
- 連続読書日数: 1ページ以上の日を数え、当日が未記録なら前日から数えます。
- 本ごとのログ: `{ logs: [{ id, date, pagesRead, readingDay, readingTimezoneRevision }] }`。日付・設定世代・IDの昇順で全記録を返します。
- 訂正: `pagesRead` は0〜1,000,000の整数。日付は実在する `YYYY-MM-DD`。未記録の日はログを作成しますが、`readingDay` または `readingTimezoneRevision` で存在しないログを指定した場合は404（`pagesRead: 0` の場合は何もせず成功）。成功応答は `{ ok: true, log }`、0ページでは `log: null`。
- 削除: 対象がなくても `{ ok: true }`。訂正・削除ともに、日付と指定条件で複数のログが一致する場合は400。
- 設定の取得・更新: `{ readingTimezone }` を返します。未設定の取得値はnull。更新ボディは `{ "readingTimezone": "Asia/Tokyo" }`。

実装: `src/server/routes/{books,reading-logs,search}.ts`、入力スキーマ: `src/server/schemas/{books,search}.ts`。

## ゲスト記録の引き継ぎ (`POST /api/guest-import`)

認証必須。本1冊と、そのメモ・読書ログをまとめて送る。入力は`src/lib/guest-schema.ts`の`GuestImportSchema`で検証する。

- `expectedUserId`: 操作開始時のアカウントID。現在のセッションと異なる場合は409。
- `libraryId`: ゲスト蔵書のUUID。
- `readingTimezone`・`readingDayOffset`・`readingTimezoneRevision`: ゲストの読書設定。
- `book`: 書誌・進捗・星の表示情報・日時・アーカイブ状態・`notes`・`logs`を含む本。

本・メモ・ログ・完了印はD1の同じbatchで保存する。利用者・蔵書・元の本IDが同じ場合は再追加せず`200 { "ok": true }`を返す。既存の同ISBNの本も更新しない。複数冊の途中で失敗した場合は再試行でき、完了済みの本はスキップする。引き継ぎ済みの本へのゲスト側の追加編集は同期しない。

アカウントのタイムゾーンが未設定ならゲストの設定を採用する。設定済みなら上書きせず、ログの論理読書日を両側の「今日」の差分だけ移し、日同士の間隔を維持する。日付表示・メモ・進捗は保持する。引き継いだログの世代番号は負数へ割り当て、今後アカウントで記録する世代（0以上）との衝突を防ぐ。読書ログの訂正・削除では、この負数の世代番号も指定できる。設定の同時変更で条件が合わない場合は409として再試行を求める。リクエストは4MB以下、本1冊の記録は1MB以下。
