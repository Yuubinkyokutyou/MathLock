# MathLock - サイトアクセス計算ゲート

指定されたWebサイトにアクセスする際に、暗算問題を連続正解しないとサイトを閲覧できないようにするChrome拡張機能です。

## 機能

- **サイトブロック**: 正規表現パターンでURLを指定してサイトをブロック
- **ホワイトリスト**: ブロック対象から除外するURLを指定
- **暗算チャレンジ**: 設定した問題数を連続正解することでアクセス許可
- **難易度調整**: 1桁〜3桁の四則演算から選択可能
- **一時アクセス許可**: 全問正解後、指定時間だけドメイン全体へのアクセスを許可
- **コンテキストメニュー**: 右クリックからサイトをブロック/ホワイトリストに追加

## インストール方法

1. このリポジトリをクローンまたはダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 右上の「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. MathLockフォルダを選択

## 使い方

### 基本的な使い方

1. 拡張機能のアイコンをクリックして設定画面を開く
2. ブロックしたいサイトのURLパターンをブラックリストに追加
3. ブロック対象サイトにアクセスすると暗算問題が表示される
4. 設定した問題数を連続正解するとサイトにアクセス可能

### 設定項目

#### 基本設定
- **連続正解必要数**: 1〜10問（デフォルト: 3問）
- **アクセス許可時間**: 1〜120分（デフォルト: 15分）

#### 問題設定
- **難易度**: レベル1（1桁）、レベル2（2桁）、レベル3（3桁）
- **演算種別**: 足し算、引き算、掛け算、割り算を個別にON/OFF可能

### URLパターンの例

- YouTube全体をブロック: `^https://.*\.youtube\.com/.*`
- 特定のドメイン: `^https://example\.com/.*`
- サブドメインを含む: `^https://([^/]*\.)?example\.com/.*`

## プロジェクト構造

```
MathLock/
├── manifest.json           # Chrome拡張機能の設定
├── background/
│   └── background.js      # Service Worker
├── content/
│   ├── content.js        # コンテンツスクリプト
│   └── modal.js          # モーダル制御
├── popup/
│   ├── popup.html        # ポップアップUI
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html      # 設定画面
│   ├── options.js
│   └── options.css
├── lib/
│   ├── storage.js        # ストレージ管理
│   ├── urlMatcher.js     # URL判定ロジック
│   └── problem/
│       ├── ProblemProvider.js      # 問題プロバイダー基底クラス
│       └── MathProblemProvider.js  # 数学問題実装
├── styles/
│   └── modal.css         # モーダルのスタイル
└── icons/                # アイコン画像
```

## 開発

### 問題プロバイダーの拡張

新しい種類の問題を追加する場合は、`ProblemProvider`クラスを継承して実装できます：

```javascript
class CustomProblemProvider extends ProblemProvider {
  generateProblem(config) {
    // 問題生成ロジック
  }
  
  validateAnswer(problem, userAnswer) {
    // 解答検証ロジック
  }
  
  formatQuestion(problem) {
    // 問題表示形式
  }
}
```

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。