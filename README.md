# YOMi ー 読書を宇宙に
## 概要
**技育CAMPハッカソン2026 vol.1 第2部 最優秀賞**

「YOMi​（ヨミ）」は​一冊の​本を​一つの​「星」に​見立てて​記録し、​自分だけの​星空を​作る​読書管理アプリです。
<img width="1200" height="675" alt="image" src="https://github.com/user-attachments/assets/ee5b2ad9-4b83-4a4f-86f6-bfef15aa9255" />

読書を​している​人なら​一度は​経験したことがある​「本を​買ったのに​結局​読んでいない」​「読書の​モチベーションが​続かない」​「読書記録アプリで​記録するのが​面倒」​「知識を​身に​付いている​実感が​湧かない」と​いう​悩み。
これらの​悩みを​解決し、​楽しく​読書管理を​して​もらう​ために​この​アプリを​制作しました。

## 技術スタック
- フロントエンド
	- **フレームワーク**: vinext（Next.js互換API / Vite）
	- **CSS フレームワーク**: PandaCSS
	- **UI フレームワーク**: LIftKit
	- **3D グラフィック**: Three.js
	- **ホスティング**: Cloudflare Workers
- バックエンド
	- **フレームワーク**: Hono
	- **バリデーション**: Zod
	- **ユーザー認証**: Better Auth
	- **ORM**: Drizzle ORM
	- **データベース**: Cloudflare D1
	- **書籍情報**: Google Books API


## リンク

- [アプリのリンク](https://yomi.suzuuuuu09.com/)
- [紹介記事](https://suzuuuuu09.com/product/yomi/)

## 開発

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` はCloudflare Vite pluginを通して、サーバー処理をローカルのWorkersランタイムで実行します。URLは `http://localhost:3000` です。既存の `pnpm dev:cf` も同じ開発サーバーを起動します。

データベースのスキーマを更新したときは、開発用D1にマイグレーションを適用してから開発サーバーを起動します。
マイグレーションはアプリ起動時には自動適用されません。既存のD1をWranglerのマイグレーション機能ではなくSQLファイルで初期化していた場合も、同じコマンドで移行履歴を補完してから未適用分を適用します。

共有または本番のD1へ適用する場合は、対象のデータベースを確認したうえで次を実行します。

```bash
pnpm db:migrate:remote
```

`db:migrate:remote`は共有データを変更するため、Wranglerの確認プロンプトで対象と変更内容を確認してください。

品質確認は次のコマンドで実行できます。

```bash
pnpm typecheck
pnpm test
pnpm lint:app
pnpm build
```

ビルド後は `pnpm start` でWorkersのローカルプレビューを起動できます。ビルド成果物は `dist/client` と `dist/server` に生成されます。

既存の `next/*` インポートはvinextが互換実装へ解決します。`next` パッケージは既存コードの型参照とテストのために残しています。Cloudflare Imagesによる画像リサイズは未設定です。

書籍APIと認証はCloudflare D1およびBetter Authの環境変数が必要です。D1のバインディング名・データベースID・マイグレーションは従来のものを維持しています。デプロイ設定の詳細は`wrangler.jsonc`と`docs/api.md`を参照してください。

デプロイ先はCloudflare PagesからWorkersへ変わります。`pnpm deploy` はビルド後にWorkerをデプロイするため、公開する際にだけ実行してください。既存のPagesのカスタムドメインやGoogle OAuthのコールバックURLは、Workersへの切替時に別途確認が必要です。
