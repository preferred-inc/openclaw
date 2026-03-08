# TSUKASA AI — 企業向けAIアシスタント

> [English README](README.md) | **日本語**

**TSUKASA AI** は、日本の企業向けに最適化されたAIアシスタントです。LINE、Slack、Discord、Telegram、Microsoft Teamsなど、日本で広く使われているチャネルを通じて、AIエージェントとシームレスにコミュニケーションできます。

セルフホスト型のGatewayを自社のインフラ上で実行し、データの管理を自社で完結できます。

## 主な特徴

- **マルチチャネル対応** — LINE、Slack、Discord、Telegram、Microsoft Teams、Google Chat、その他多数のチャネルに対応
- **セルフホスト** — 自社のサーバーで実行し、データを完全にコントロール
- **マルチエージェント** — エージェント、ワークスペース、送信者ごとにセッションを分離
- **日本語完全対応** — UIおよびドキュメントの日本語ローカライズ済み
- **メディアサポート** — 画像、音声、ドキュメントの送受信
- **Web Control UI** — ブラウザベースのダッシュボードでチャット、設定、セッションを管理

## クイックスタート

**必要条件**: Node 22以降

```bash
# インストール
npm install -g openclaw@latest

# オンボーディングウィザードを実行
openclaw onboard --install-daemon

# Gatewayを起動
openclaw gateway --port 18789
```

## Control UIを開く

Gatewayの起動後、ブラウザで以下にアクセスしてください：

- ローカル: [http://127.0.0.1:18789/](http://127.0.0.1:18789/)

## 設定

設定ファイルは `~/.openclaw/openclaw.json` にあります。

```json5
{
  channels: {
    line: {
      // LINE チャネルの設定
    },
    slack: {
      // Slack チャネルの設定
    },
    discord: {
      // Discord チャネルの設定
    },
  },
}
```

## 対応チャネル（日本市場向け）

| チャネル            | 説明                                       |
| ------------------- | ------------------------------------------ |
| **LINE**            | 日本で最も普及しているメッセージングアプリ |
| **Slack**           | 企業向けコラボレーションツール             |
| **Discord**         | コミュニティ・チーム向けチャット           |
| **Telegram**        | セキュアなメッセージング                   |
| **Microsoft Teams** | エンタープライズ向けコミュニケーション     |
| **Google Chat**     | Google Workspace連携                       |

全チャネルの一覧と設定方法は [ドキュメント](https://docs.openclaw.ai/channels) をご覧ください。

## ドキュメント

- [はじめに](https://docs.openclaw.ai/ja-JP/start/getting-started)
- [オンボーディングウィザード](https://docs.openclaw.ai/ja-JP/start/wizard)
- [Gateway設定](https://docs.openclaw.ai/gateway/configuration)
- [チャネル設定](https://docs.openclaw.ai/channels)
- [セキュリティ](https://docs.openclaw.ai/gateway/security)

## 開発

```bash
git clone https://github.com/preferred-inc/openclaw.git
cd openclaw

pnpm install
pnpm ui:build
pnpm build

pnpm openclaw onboard --install-daemon
```

## Fork元の更新取り込み

本リポジトリは [openclaw/openclaw](https://github.com/openclaw/openclaw) のフォークです。upstream の変更を取り込むには：

```bash
git remote add upstream https://github.com/openclaw/openclaw.git
git fetch upstream
git merge upstream/main
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。
