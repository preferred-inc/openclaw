# 管理者セットアップガイド

OpenClaw（TSUKASA AI）ゲートウェイの管理者向けセットアップ手順です。

## 目次

1. [前提条件](#前提条件)
2. [インストール](#インストール)
3. [初期設定](#初期設定)
4. [認証設定](#認証設定)
5. [チャネル設定](#チャネル設定)
6. [セキュリティ設定](#セキュリティ設定)
7. [ブランドカスタマイズ](#ブランドカスタマイズ)
8. [運用・保守](#運用保守)

---

## 前提条件

- **Node.js** v20 以上
- **npm** または **pnpm**
- 対応チャネルのAPIキー/トークン（LINE、Slack、Discord など）
- LLMプロバイダーのAPIキー（OpenAI、Anthropic など）

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/preferred-inc/openclaw.git
cd openclaw

# 依存パッケージのインストール
npm install

# ビルド
npm run build
```

## 初期設定

### 設定ファイル

`config.yaml` をプロジェクトルートに作成します：

```yaml
gateway:
  # ゲートウェイの公開URL
  url: "https://your-domain.example.com"

  # 認証設定
  auth:
    mode: "password" # "token" | "password" | "trusted-proxy" | "none"
    password: "your-secure-password"

  # エージェント設定
  agents:
    - name: "default"
      model: "gpt-4o"
```

### 環境変数

以下の環境変数で設定を上書きできます：

| 変数名                      | 説明               | 例                |
| --------------------------- | ------------------ | ----------------- |
| `OPENCLAW_GATEWAY_TOKEN`    | APIトークン        | `sk-...`          |
| `OPENCLAW_GATEWAY_PASSWORD` | 管理画面パスワード | `secure-password` |
| `OPENAI_API_KEY`            | OpenAI APIキー     | `sk-...`          |
| `ANTHROPIC_API_KEY`         | Anthropic APIキー  | `sk-ant-...`      |

## 認証設定

### パスワード認証（デフォルト）

```yaml
gateway:
  auth:
    mode: "password"
    password: "your-secure-password"
```

### トークン認証

```yaml
gateway:
  auth:
    mode: "token"
    token: "your-api-token"
```

### Tailscale認証

社内VPN経由でのアクセスに対応：

```yaml
gateway:
  auth:
    mode: "token"
    allowTailscale: true
```

### SSO/SAML認証（エンタープライズ）

> **注意**: SSO機能は現在開発中です。以下は設定の参考例です。

```yaml
gateway:
  auth:
    sso:
      enabled: true
      protocol: "saml"
      spEntityId: "https://your-domain.example.com"
      saml:
        entryPoint: "https://idp.example.com/sso/saml"
        cert: |
          -----BEGIN CERTIFICATE-----
          ... IdPの証明書 ...
          -----END CERTIFICATE-----
      allowedDomains:
        - "your-company.co.jp"
```

### IP制限

社内ネットワークからのみアクセスを許可：

```yaml
gateway:
  security:
    ipRestriction:
      enabled: true
      allow:
        - "192.168.0.0/16" # 社内LAN
        - "10.0.0.0/8" # VPN
      allowLoopback: true # localhost許可
```

## チャネル設定

### LINE

```yaml
channels:
  line:
    channelAccessToken: "your-line-token"
    channelSecret: "your-line-secret"
```

### Slack

```yaml
channels:
  slack:
    botToken: "xoxb-..."
    appToken: "xapp-..."
```

### Discord

```yaml
channels:
  discord:
    botToken: "your-discord-bot-token"
```

### Telegram

```yaml
channels:
  telegram:
    botToken: "your-telegram-bot-token"
```

その他のチャネル（Google Chat、Signal、WhatsApp、iMessage、Nostr）の設定は管理画面の「Channels」タブから行えます。

## セキュリティ設定

### RBAC（ロールベースアクセス制御）

> **注意**: RBAC機能は現在開発中です。

ユーザーごとに異なる権限レベルを設定できます：

| ロール   | 説明         | 権限                                   |
| -------- | ------------ | -------------------------------------- |
| `admin`  | 管理者       | すべての操作                           |
| `user`   | 一般ユーザー | チャット、チャネル操作、セッション管理 |
| `viewer` | 閲覧者       | 読み取り専用                           |

```yaml
gateway:
  security:
    rbac:
      enabled: true
      defaultRole: "user"
      assignments:
        - userId: "admin@company.co.jp"
          role: "admin"
        - userId: "viewer@company.co.jp"
          role: "viewer"
```

### 監査ログ

> **注意**: 監査ログ機能は現在開発中です。

誰がいつ何をしたかを記録します：

```yaml
gateway:
  security:
    auditLog:
      enabled: true
      maxEvents: 10000
      filePath: "/var/log/openclaw/audit.jsonl"
```

## ブランドカスタマイズ

管理画面のロゴやタイトルをカスタマイズできます：

```yaml
gateway:
  controlUi:
    brandLogoUrl: "https://your-domain.example.com/logo.svg"
    brandTitle: "Your Company AI"
```

## 運用・保守

### サービスの起動

```bash
# 開発モード
npm run dev

# 本番モード
npm run build && npm start
```

### ログの確認

管理画面の「Logs」タブからリアルタイムでログを確認できます。

### アップデート

```bash
# 最新版の取得
git pull origin main

# 依存パッケージの更新
npm install

# 再ビルド
npm run build
```

### バックアップ

以下のファイル/ディレクトリを定期的にバックアップしてください：

- `config.yaml` — ゲートウェイ設定
- `data/` — セッションデータ、監査ログ
- `.env` — 環境変数（存在する場合）

---

## サポート

問題が発生した場合は、以下をご確認ください：

- [FAQ / トラブルシューティング](./faq.md)
- [エンドユーザーガイド](./user-guide.md)
- GitHub Issues: https://github.com/preferred-inc/openclaw/issues
