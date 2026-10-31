# Observatoryデザイン確認

final result: passed

## 比較対象と証拠

- 基準: ユーザー承認のAmbient Cosmos最終ボード。[参照画像](docs/qa/observatory/reference.webp)。原本は添付画像 `exec-6eaaf13e-b74a-4d73-b381-c58218693a55.png`（1586×992px）。
- 実装: `http://localhost:3000/app`。内蔵ブラウザの接続に失敗したため、独立した検証用Chromiumをagent-browserで使用。既存の開発サーバーを使用し、利用者のブラウザやセッションは変更していない。
- 認証・書籍APIの応答をブラウザ内だけでサンプルに差し替えたUI検証。本番への保存・実ログインの検証とは区別する。書影も比較用に参照ボードから抜き出したサンプルで、アプリへの固定画像の組み込みはしていない。
- PC: CSS viewport 1440×724、density 1。[実装](docs/qa/observatory/desktop.webp)、[横並び比較](docs/qa/observatory/compare-desktop.webp)。参照のPC領域1136×571pxを縦横比を保って1440×724に正規化。
- モバイル: CSS viewport 390×932、density 1。[実装](docs/qa/observatory/mobile.webp)、[横並び比較](docs/qa/observatory/compare-mobile.webp)。参照362×865pxを390×932に正規化。別途390×844でも操作・シート・ラベルのassertを実行。
- Empty State: CSS viewport 1440×363、density 1。[実装](docs/qa/observatory/empty.webp)、[横並び比較](docs/qa/observatory/compare-empty.webp)。ボードの浅いプレビュー領域1136×286pxを同比率に正規化。通常の1440×724でも表示を確認。
- 詳細の文字・書影・進捗・ボタンは[拡大比較](docs/qa/observatory/compare-panel.webp)で確認。比較画像はいずれも左が基準、右が実装。

## 比較履歴

1. [P1] テクスチャ初回取得時にCanvas全体がサスペンド・再生成され、WebGLコンテキストが失われた。Canvas内のSuspenseで待つよう修正。最終ページではWebGL生存をassert。
2. [P2] 加算合成する画像の黒い矩形が透明Canvas越しに見えた。Three.jsのシーン背景を不透明な濃紺に設定し、最終比較で矩形が消えたことを確認。
3. [P2] ラベルの投影原点がカメラの注視点とずれていた。Htmlの配置原点を画面中央に固定。全ラベルの画面内配置・非重複をassert。
4. [P2] PCからモバイルへサイズ変更した際、星が画面外へ広がった。サイズとパネル表示の変更時に、利用可能な縦横の範囲からフレーミングを再計算。最終モバイルとPCの比較で再確認。
5. [P2] 最初のPC実装は詳細パネル・書影と星の分布が小さかった。パネル480px、書影110×150px、見える領域に合わせたカメラへ調整。最終の横並び・拡大比較で、主操作と書籍情報の階層を確認。
6. [P2] モバイルの追加ボタンのラベルがシートに隠れた。ボタンの下に28pxの余白を確保し、最終モバイルで確認。
7. [P2] 取得失敗後に通知を閉じると空の宇宙を表示した。取得状態を通知と分離。失敗通知を閉じても再読み込みが残り、Empty Stateに変わらないことをassert。
8. 主ボタンのホバー色は白文字のコントラストが不足したため暗くした。通常色4.70:1、ホバー色5.95:1を計算確認。

## 操作と自動チェック

- PC・モバイル: 星の書名ラベル／一覧／読書中ショートカットから詳細を表示。
- 「読書を記録する」から入力と加減算を展開し、+1で168→169ページを表示。メモと編集は副操作として維持。
- メモの保存応答を失敗させ、下書きが残ることをassert。
- 検索を展開して0件の結果を表示し、Escapeで検索・フィルターを解除。一覧から本を選択。設定・アーカイブ一覧への入口も確認。
- 初回0冊からCTA→手動入力→登録成功→Empty State終了・星の表示まで操作。
- 取得失敗→通知を閉じる→再読み込み→正常な0冊へ移行。
- 6冊と、同じ位置に24冊を追加した計30冊のサンプルでラベルを確認。選択した本を優先し、重なるラベルを抑制。
- 最終の新規ブラウザセッションでページエラー0件。既存ライブラリ由来のThree.Clock非推奨警告は残る。
- axe WCAG 2 A/AA: 違反0件、20項目合格。Canvas背景のコントラスト判定はincompleteのため、自動検査だけで適合とは判定しない。
- `pnpm test`: 14ファイル・58テスト成功。調整後のHTMLテスト、型チェック、変更ファイルのBiome、`pnpm lint:app`、最終`pnpm build`も成功。

### ラベルとシートのself-check

選択した「星の王子さま」が画面内にあるサンプルで、ブラウザ内で以下を実行した。390×844、390×932、1440×724、および密集した30冊で成功。

```js
const assert = (value, message) => { if (!value) throw new Error(message); };
const labels = [...document.querySelectorAll('[data-book-label]')]
  .filter(element => !element.hidden);
assert(labels.length > 0 && labels.length <= (innerWidth < 768 ? 3 : 7), 'label count');
const rectangles = labels.map(element => element.getBoundingClientRect());
rectangles.forEach((a, index) => {
  assert(a.left >= 0 && a.right <= innerWidth && a.top >= 90 && a.bottom <= innerHeight, 'viewport');
  rectangles.slice(index + 1).forEach(b => {
    assert(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, 'overlap');
  });
});
assert(!document.querySelector('[data-book-label="prince"]').hidden, 'selected priority');
assert(!document.querySelector('canvas').getContext('webgl2').isContextLost(), 'WebGL');
const panel = document.querySelector('section[aria-labelledby="selected-book-title"]');
if (innerWidth < 768) assert(panel.getBoundingClientRect().top >= innerHeight / 2, 'upper half');
```

## 2026-10-26: vinext移行後の確認

- Cloudflare Workersのビルドとローカルプレビューで、ログイン画面と未認証時の転送・APIの401応答を確認。
- ブラウザ内のサンプル応答で1440×900の3D画面、390×844の詳細シートを確認。ページエラーなし。Three.Clockの上流警告は残る。
- 実際のBetter Authによる署名検証とD1バインディング経由の書籍保存・再取得を、SQLiteを使う境界テストで確認。Google OAuthと本番D1の動作は未確認。
- 62テスト、型チェック、lint、ビルド、ローカルD1のスキーマ確認、Wranglerのデプロイdry-runが成功。依存監査は既知の脆弱性0件、peer依存の問題0件。
- 公開・ドメイン切替は未実施。画像リサイズ用オプティマイザーは未設定。vinextの互換性検査は画像設定を部分対応と報告するが、使用中のNext.js APIに非対応項目はない。

## 意図した差と未確認事項

- 実フォントはNoto Sans JP。生成画像の近似字形は再現せず、本文・ボタンは実際のWebフォントで読みやすく表示する。
- 星の配置・明るさ・星座線は実際の蔵書と既存の読了・ジャンル条件から決まる。サンプル画像の読書中の星へ装飾的な星座線を足すことはしない。
- 詳細の末尾に「読書の記録・書籍情報」を残し、既存の統計・ログ訂正・アーカイブを利用できる。初期表示の情報量を抑え、必要時に展開する。
- P3: 生成画像と完全に同一の光・宇宙塵の形にはしない。操作可能な3D空間と画面サイズによる自然な変化を優先する。
- 実機iOS/Androidのジャイロ・カメラ、実Googleログイン、本番D1への保存、実機GPU負荷は未確認。既存のセンサー許可と保存処理は維持している。
