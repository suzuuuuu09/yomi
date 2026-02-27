# UI/UX

## デザイン原則

- Deep Layering: 背景（3D空間）、ミドル（星座の結線）、フロント（2Dの操作パネル）の3層構造
- Dynamic Feedback: ユーザーのアクションに対して、星の誕生やまたたきなどの動的なフィードバックを提供
- 宇宙の視認性を妨げずに、必要な情報を適切に表示するバランスの取れたUI


## 画面レイアウト

### 全体構造
layout.tsxで定義
- **Layer 0**: `UniverseCanvas` (R3F) -> `position: fixed; inset: 0;`
- **Layer 1**: `InteractiveOverlay` -> `SVG/Canvas` (星座の線アニメーション用)
- **Layer 2**: `UIContent` -> `Next.js Pages` (操作パネル、文字情報)

### 画面別構成

#### 1. Observatory (Main Dashboard)
- **Top Bar**: 
  - Left: 検索・フィルタ (ジャンル別、未読/既読)
  - Right: プロフィール・設定
- **Main View**: 
  - 3D星空。ドラッグで視点移動。
  - 星をクリックで詳細パネル(Side Panel)がスライドイン。
- **Bottom Navigation (Dock)**:
  - Liftkit の `HorizontalStack` を使用。
  - 「Now Reading」の本を最大3冊まで表示。
  - ミニプログレスバーと「+1P」クイックボタン。

#### 2. Manifestation (Add Book)
- **Modal View**:
  - 中央配置の Glassmorphism パネル。
  - ISBN入力フィールド、またはタイトル検索。
  - 候補選択時に「星のプレビュー」を表示。

#### 3. Star Insight (Detail View)
- **Side Panel (Right-aligned)**:
  - 書影、タイトル、著者。
  - **Reading Graph**: 日々のページ更新履歴。
  - **Nebula Tags**: その本に関連付けられたタグ（星座名）。
