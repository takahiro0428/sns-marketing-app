# Firebase / Google Cloud / GitHub セットアップ手順書

このドキュメントでは、SNS Marketing Automation アプリケーションの運用に必要なすべての外部サービスの設定手順を、ステップバイステップで説明します。

---

## 目次

1. [Google Cloud プロジェクトの作成](#1-google-cloud-プロジェクトの作成)
2. [Firebase プロジェクトの設定](#2-firebase-プロジェクトの設定)
3. [Firebase Authentication の設定](#3-firebase-authentication-の設定)
4. [Cloud Firestore の設定](#4-cloud-firestore-の設定)
5. [Firebase Storage の設定](#5-firebase-storage-の設定)
6. [Firebase Hosting の設定](#6-firebase-hosting-の設定)
7. [Vertex AI (Gemini) API の有効化](#7-vertex-ai-gemini-api-の有効化)
8. [サービスアカウントの作成](#8-サービスアカウントの作成)
9. [GitHub Repository Secrets の設定](#9-github-repository-secrets-の設定)
10. [X (Twitter) Developer アカウントの設定](#10-x-twitter-developer-アカウントの設定)
11. [Note アカウントの準備](#11-note-アカウントの準備)
12. [Cloud Scheduler の設定（自動投稿用）](#12-cloud-scheduler-の設定自動投稿用)
13. [デプロイの実行](#13-デプロイの実行)
14. [動作確認チェックリスト](#14-動作確認チェックリスト)

---

## 1. Google Cloud プロジェクトの作成

### 1.1 Google Cloud Console にアクセス

1. ブラウザで [Google Cloud Console](https://console.cloud.google.com/) を開きます
2. Google アカウントでログインします（まだの場合）

### 1.2 新しいプロジェクトを作成

1. 画面上部のプロジェクトセレクター（「プロジェクトを選択」と表示されている箇所）をクリック
2. 右上の「**新しいプロジェクト**」をクリック
3. 以下を入力：
   - **プロジェクト名**: `sns-marketing-app`（任意の名前）
   - **組織**: 個人の場合は「組織なし」のまま
   - **場所**: デフォルトのまま
4. 「**作成**」をクリック
5. 作成完了後、そのプロジェクトが選択されていることを確認

### 1.3 プロジェクト ID をメモ

1. 画面上部のプロジェクト名の横に表示されている **プロジェクト ID** をメモします
   - 例: `sns-marketing-app-12345`
   - この ID は後の手順で頻繁に使用します

### 1.4 課金を有効化

1. 左メニューから「**お支払い**」を選択
2. 「**課金アカウントをリンク**」をクリック
3. 既存の課金アカウントを選択、または新規作成
   - **注意**: 無料枠内で運用可能ですが、課金アカウントのリンクは必要です

---

## 2. Firebase プロジェクトの設定

### 2.1 Firebase Console にアクセス

1. [Firebase Console](https://console.firebase.google.com/) を開きます

### 2.2 Firebase プロジェクトを追加

1. 「**プロジェクトを追加**」をクリック
2. **「既存の Google Cloud プロジェクトに Firebase を追加」** を選択
3. 手順1で作成したプロジェクト（`sns-marketing-app`）を選択
4. 「**続行**」をクリック
5. Google Analytics の有効化は任意（「このプロジェクトで Google Analytics を有効にする」のトグル）
   - 有効にする場合はデフォルトの GA アカウントを選択
6. 「**Firebase を追加**」をクリック

### 2.3 Web アプリを追加

1. Firebase Console のプロジェクト概要ページで、**Web アイコン（`</>`）** をクリック
2. アプリのニックネームを入力：`sns-marketing-web`
3. 「**Firebase Hosting も設定する**」にチェックを入れる
4. 「**アプリを登録**」をクリック
5. 表示される **Firebase 構成オブジェクト** の値をすべてメモします：
   ```
   apiKey: "AIza..."
   authDomain: "sns-marketing-app-12345.firebaseapp.com"
   projectId: "sns-marketing-app-12345"
   storageBucket: "sns-marketing-app-12345.firebasestorage.app"
   messagingSenderId: "123456789"
   appId: "1:123456789:web:abc123..."
   ```
   - **重要**: これらの値は後の GitHub Secrets 設定で使用します
6. 「**コンソールに進む**」をクリック

---

## 3. Firebase Authentication の設定

### 3.1 Authentication を有効化

1. Firebase Console の左メニューから「**Authentication**」をクリック
2. 「**始める**」をクリック

### 3.2 メール/パスワード認証を有効化

1. 「**Sign-in method**」タブを選択
2. 「**メール/パスワード**」をクリック
3. 「**有効にする**」のトグルをオンにする
4. 「**保存**」をクリック

### 3.3 Google 認証を有効化

1. 「**Sign-in method**」タブに戻る
2. 「**Google**」をクリック
3. 「**有効にする**」のトグルをオンにする
4. **プロジェクトのサポートメール**を選択（自分のメールアドレス）
5. 「**保存**」をクリック

### 3.4 承認済みドメインの確認

1. 「**Settings**」タブを選択
2. 「**承認済みドメイン**」セクションで以下が含まれていることを確認：
   - `localhost`
   - `sns-marketing-app-12345.firebaseapp.com`（自動追加）
   - `sns-marketing-app-12345.web.app`（自動追加）

---

## 4. Cloud Firestore の設定

### 4.1 Firestore を作成

1. Firebase Console の左メニューから「**Firestore Database**」をクリック
2. 「**データベースを作成**」をクリック
3. **ロケーション**を選択：
   - **推奨**: `asia-northeast1`（東京）
   - **注意**: 一度選択すると変更できません
4. 「**本番環境モードで開始**」を選択
   - セキュリティルールはデプロイ時に自動設定されます
5. 「**作成**」をクリック

### 4.2 データベース ID の確認

1. 作成したデータベースの **データベース ID** を確認します
   - **デフォルトデータベース**の場合: ID は `(default)` です。Repository Secrets への設定は不要です
   - **名前付きデータベース**を作成した場合: そのID（例: `my-database`）をメモし、Repository Secrets の `FIRESTORE_DATABASE_ID` に設定してください
   - データベース ID は Firebase Console の Firestore Database ページの上部に表示されます

### 4.3 セキュリティルールの確認

- セキュリティルールは `app/firestore.rules` に定義済みです
- GitHub Actions のデプロイで自動的に適用されます
- 手動で適用する場合：
  1. Firestore の「**ルール**」タブを開く
  2. `app/firestore.rules` の内容をコピー＆ペースト
  3. 「**公開**」をクリック

---

## 5. Firebase Storage の設定

### 5.1 Storage を作成

1. Firebase Console の左メニューから「**Storage**」をクリック
2. 「**始める**」をクリック
3. 「**本番環境モードで開始**」を選択
4. **ロケーション**：Firestore と同じリージョン（`asia-northeast1`）を選択
5. 「**完了**」をクリック

### 5.2 バケット名をメモ

1. Storage のページ上部に表示されるバケット名をメモ
   - 通常は `sns-marketing-app-12345.firebasestorage.app` の形式
   - **重要**: もし Firestore で別のバケット名にした場合はそちらを使用

---

## 6. Firebase Hosting の設定

Firebase Hosting は Web アプリ追加時に自動的に設定されています。追加の手動設定は不要です。

カスタムドメインを使用する場合：
1. Firebase Console の「**Hosting**」を開く
2. 「**カスタムドメインを追加**」をクリック
3. ドメインを入力し、DNS 設定の指示に従う

---

## 7. Vertex AI (Gemini) API の有効化

### 7.1 API を有効化

1. [Google Cloud Console](https://console.cloud.google.com/) に戻る
2. 正しいプロジェクトが選択されていることを確認
3. 左メニューから「**API とサービス**」→「**ライブラリ**」を選択
4. 検索バーに「**Vertex AI API**」と入力
5. 「**Vertex AI API**」をクリック
6. 「**有効にする**」をクリック

### 7.2 Generative AI API も有効化

1. 同じ手順で「**Generative Language API**」を検索
2. 「**有効にする**」をクリック

### 7.3 リージョンの確認

- デフォルトでは `us-central1` を使用します
- 別のリージョンを使用する場合は、後述の GitHub Secrets で `VERTEX_AI_LOCATION` を設定してください

---

## 8. サービスアカウントの作成

### 8.1 サービスアカウントを作成

1. Google Cloud Console の左メニューから「**IAM と管理**」→「**サービスアカウント**」を選択
2. 「**+ サービスアカウントを作成**」をクリック
3. 以下を入力：
   - **サービスアカウント名**: `github-actions-deploy`
   - **サービスアカウント ID**: 自動入力されます
   - **説明**: `GitHub Actions からのデプロイ用`
4. 「**作成して続行**」をクリック

### 8.2 ロールを付与

以下のロールを**すべて**追加します（「**+ 別のロールを追加**」で追加）：

| ロール | 用途 |
|--------|------|
| `Firebase Admin SDK 管理者サービス エージェント` | Firebase Admin SDK の使用 |
| `Firebase Hosting 管理者` | Hosting へのデプロイ |
| `Cloud Functions 管理者` | Cloud Functions のデプロイ |
| `Cloud Datastore ユーザー` | Firestore の読み書き |
| `ストレージ管理者` | Cloud Storage の管理 |
| `Vertex AI ユーザー` | Vertex AI API の呼び出し |
| `サービスアカウントユーザー` | サービスアカウントの利用 |
| `Cloud Run 管理者` | Cloud Run（Functions Gen2）の管理 |
| `Artifact Registry 管理者` | コンテナイメージの管理 |

5. 「**続行**」をクリック
6. 「**完了**」をクリック

### 8.3 サービスアカウントキーを作成

1. 作成したサービスアカウント（`github-actions-deploy@...`）をクリック
2. 「**鍵**」タブを選択
3. 「**鍵を追加**」→「**新しい鍵を作成**」をクリック
4. **キーのタイプ**: `JSON` を選択
5. 「**作成**」をクリック
6. JSON ファイルが自動的にダウンロードされます
   - **重要**: このファイルは安全に保管してください。紛失した場合は再生成が必要です
   - ファイルの中身をすべてコピーしてメモします（GitHub Secrets で使用）

### 8.4 サービスアカウントキーから必要な値を抽出

ダウンロードした JSON ファイルを開き、以下の値をメモします：

```json
{
  "project_id": "→ FIREBASE_ADMIN_PROJECT_ID として使用",
  "client_email": "→ FIREBASE_ADMIN_CLIENT_EMAIL として使用",
  "private_key": "→ FIREBASE_ADMIN_PRIVATE_KEY として使用（改行含む文字列全体）"
}
```

---

## 9. GitHub Repository Secrets の設定

### 9.1 GitHub リポジトリの Settings を開く

1. GitHub で対象リポジトリ（`takahiro0428/sns-marketing-app`）を開く
2. 「**Settings**」タブをクリック
3. 左メニューから「**Secrets and variables**」→「**Actions**」を選択

### 9.2 Repository Secrets を追加

「**New repository secret**」をクリックして、以下のシークレットを**すべて**追加します：

| Secret 名 | 値の取得元 | 説明 |
|-----------|-----------|------|
| `FIREBASE_API_KEY` | 手順2.3の構成オブジェクト `apiKey` | Firebase クライアント API キー |
| `FIREBASE_AUTH_DOMAIN` | 手順2.3の構成オブジェクト `authDomain` | Firebase 認証ドメイン。**未設定の場合**: `{PROJECT_ID}.firebaseapp.com` が自動適用 |
| `FIREBASE_PROJECT_ID` | 手順2.3の構成オブジェクト `projectId` | Firebase プロジェクト ID |
| `FIREBASE_STORAGE_BUCKET` | 手順5.2のバケット名 | Firebase Storage バケット名。**未設定の場合**: `{PROJECT_ID}.firebasestorage.app` が自動適用 |
| `FIREBASE_MESSAGING_SENDER_ID` | 手順2.3の構成オブジェクト `messagingSenderId` | Firebase メッセージング送信者 ID |
| `FIREBASE_APP_ID` | 手順2.3の構成オブジェクト `appId` | Firebase アプリ ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 手順8.3でダウンロードしたJSONファイルの**中身全体** | サービスアカウントキー（デプロイ用） |

### 9.3 オプションの Secrets（必要に応じて設定）

| Secret 名 | デフォルト値 | 説明 |
|-----------|-------------|------|
| `FIREBASE_ADMIN_PROJECT_ID` | `FIREBASE_PROJECT_ID` と同じ | 別のFirebaseプロジェクトを使う場合 |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | サービスアカウントJSONから自動取得 | サーバーサイド認証用 |
| `FIREBASE_ADMIN_PRIVATE_KEY` | サービスアカウントJSONから自動取得 | サーバーサイド認証用 |
| `FIRESTORE_DATABASE_ID` | `(default)` | Firestoreデータベース ID。デフォルトデータベースを使う場合は設定不要。名前付きデータベースを使用する場合にそのIDを指定（例: `my-database`） |
| `VERTEX_AI_PROJECT_ID` | `FIREBASE_PROJECT_ID` と同じ | 別のGCPプロジェクトでVertex AIを使う場合 |
| `VERTEX_AI_LOCATION` | `us-central1` | Vertex AIのリージョン |
| `VERTEX_AI_MODEL` | `gemini-2.0-flash` | Vertex AIで使用するモデル名。利用可能なモデル: `gemini-2.0-flash`（推奨・高速）、`gemini-2.0-flash-lite`（低コスト）、`gemini-1.5-pro`（高品質） |
| `SCHEDULER_API_KEY` | なし（要設定） | Cloud Schedulerからの自動投稿APIキー。任意のランダム文字列を生成して設定（例: `openssl rand -hex 32` で生成） |

> **重要**:
> - `FIREBASE_AUTH_DOMAIN` と `FIREBASE_STORAGE_BUCKET` は未設定でもデフォルト値が適用されます
> - `FIRESTORE_DATABASE_ID` は通常 `(default)` で問題ありません。Firebase Console で名前付きデータベースを作成した場合のみ変更してください
> - `VERTEX_AI_MODEL` はプロジェクトの課金プランとリージョンで利用可能なモデルが異なります。[Vertex AI モデル一覧](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models) を確認してください
> - `SCHEDULER_API_KEY` は自動投稿機能を使用する場合に必須です。手順12で Cloud Scheduler を設定する際に使用します

---

## 10. X (Twitter) Developer アカウントの設定

### 10.1 Developer Portal にアクセス

1. [X Developer Portal](https://developer.x.com/en/portal/dashboard) にアクセス
2. X アカウントでログイン

### 10.2 アプリを作成

1. 「**+ Create App**」をクリック（Free tier で OK）
2. アプリ名を入力：`SNS Marketing Bot`
3. 「**Get API Keys**」をクリック

### 10.3 API キーをメモ

表示される以下の値をメモします：
- **API Key**: `xxxxxxx`
- **API Secret**: `xxxxxxx`

### 10.4 Access Token を生成

1. アプリの「**Keys and tokens**」タブを開く
2. 「**Access Token and Secret**」セクションの「**Generate**」をクリック
3. 表示される以下の値をメモ：
   - **Access Token**: `xxxxxxx`
   - **Access Token Secret**: `xxxxxxx`

### 10.5 アプリの権限を設定

1. アプリの「**Settings**」タブを開く
2. 「**User authentication settings**」の「**Set up**」をクリック
3. **App permissions**: 「**Read and write**」を選択
4. **Type of App**: 「**Web App, Automated App or Bot**」を選択
5. **Callback URI**: `https://sns-marketing-app-12345.firebaseapp.com/callback`（実際のドメインに置換）
6. **Website URL**: `https://sns-marketing-app-12345.web.app`
7. 「**Save**」をクリック

### 10.6 アプリ内で設定

- X の API キーはアプリのプロジェクト設定画面（設定 → X (Twitter) API設定）から設定できます
- 環境変数としても設定可能ですが、プロジェクト単位の設定を推奨します

---

## 11. Note アカウントの準備

### 11.1 Note アカウントを作成

1. [note.com](https://note.com/) にアクセス
2. 無料アカウントを作成（メールアドレスとパスワード）
3. プロフィールを設定

### 11.2 アプリ内で設定

- Note のログイン情報はアプリのプロジェクト設定画面（設定 → Note認証設定）から入力します
- パスワードはサーバー側で暗号化されて Firestore に保存されます
- 「**接続テスト**」ボタンで接続を確認できます

---

## 12. Cloud Scheduler の設定（自動投稿用）

スケジュールされた投稿を自動的に処理するために、Cloud Scheduler を設定します。

### 12.1 Cloud Scheduler API を有効化

1. Google Cloud Console で「**API とサービス**」→「**ライブラリ**」を開く
2. 「**Cloud Scheduler API**」を検索して有効化

### 12.2 ジョブを作成

1. Google Cloud Console の左メニューから「**Cloud Scheduler**」を選択
2. 「**ジョブを作成**」をクリック
3. 以下を入力：
   - **名前**: `process-scheduled-posts`
   - **リージョン**: `asia-northeast1`（Tokyo）
   - **説明**: `スケジュールされた投稿を処理`
   - **頻度**: `*/15 * * * *`（15分ごと）
   - **タイムゾーン**: `Asia/Tokyo`
4. **ターゲット**を設定：
   - **ターゲットタイプ**: `HTTP`
   - **URL**: `https://sns-marketing-app-12345.web.app/api/scheduler/process`
   - **HTTP メソッド**: `POST`
   - **ヘッダー**: `Content-Type: application/json`
   - **本文**: `{"apiKey": "サービスアカウントの private_key の先頭32文字"}`
5. **認証**を設定：
   - **認証ヘッダー**: `OIDC トークンを追加`
   - **サービスアカウント**: `github-actions-deploy@...`
   - **対象者**: デプロイした Cloud Functions の URL
6. 「**作成**」をクリック

---

## 13. デプロイの実行

### 13.1 自動デプロイ

1. `main` ブランチにコードをマージすると、GitHub Actions が自動的にデプロイを実行します
2. GitHub リポジトリの「**Actions**」タブでデプロイの進捗を確認できます

### 13.2 手動デプロイ

1. GitHub リポジトリの「**Actions**」タブを開く
2. 「**Deploy to Firebase**」ワークフローを選択
3. 「**Run workflow**」→ ブランチを選択 →「**Run workflow**」をクリック

### 13.3 デプロイエラーの対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `PERMISSION_DENIED` | サービスアカウントの権限不足 | 手順8.2のロールを確認 |
| `PROJECT_NOT_FOUND` | プロジェクト ID が不正 | `FIREBASE_PROJECT_ID` の値を確認 |
| `INVALID_ARGUMENT` | Secret の値が不正 | JSON 全体がコピーされているか確認 |
| `BUILD_FAILED` | ビルドエラー | Actions のログを確認 |

---

## 14. 動作確認チェックリスト

デプロイ完了後、以下の項目を順に確認します：

### 基本動作
- [ ] `https://sns-marketing-app-12345.web.app` にアクセスできる
- [ ] ログインページが表示される
- [ ] メール/パスワードで新規登録ができる
- [ ] Google ログインができる
- [ ] ログアウトができる

### プロジェクト管理
- [ ] 新しいプロジェクトを作成できる
- [ ] プロジェクト一覧が表示される
- [ ] プロジェクトを選択してダッシュボードに遷移する
- [ ] プロジェクト設定を変更して保存できる

### コンテンツ管理
- [ ] テキストファイルをアップロードできる
- [ ] テキストを直接入力して保存できる
- [ ] コンテンツの一覧が表示される
- [ ] コンテンツを削除できる

### 配信計画
- [ ] コンテンツを選択してAI配信計画を生成できる
- [ ] 生成された計画の章立てが表示される
- [ ] 章のタイトル・概要を編集できる
- [ ] 計画を承認できる

### 記事生成
- [ ] 配信計画の章から記事を生成できる
- [ ] 生成された記事を編集できる
- [ ] 記事のプレビューが表示される

### プラットフォーム連携
- [ ] Note の認証情報を設定できる
- [ ] Note の接続テストが成功する
- [ ] X の API 設定を保存できる
- [ ] X の接続テストが成功する

### 投稿
- [ ] 記事をNoteに投稿できる
- [ ] 記事をXに投稿できる
- [ ] 投稿ログに記録される
- [ ] レート制限が正しく機能する

### スケジュール
- [ ] 手動でスケジュールを追加できる
- [ ] 自動スケジュール生成が機能する
- [ ] Cloud Scheduler による自動投稿が動作する

---

## トラブルシューティング

### Firebase 関連

**Q: Firestore のデータが読めない**
- セキュリティルールが正しくデプロイされているか確認
- Firebase Console の Firestore → ルール タブで確認

**Q: Storage にアップロードできない**
- Storage ルールが正しくデプロイされているか確認
- ファイルサイズが10MB以下か確認

### Vertex AI 関連

**Q: 記事生成でエラーになる**
- Vertex AI API が有効化されているか確認
- サービスアカウントに「Vertex AI ユーザー」ロールがあるか確認
- プロジェクトの課金が有効か確認
- `VERTEX_AI_MODEL` に指定したモデルがリージョンで利用可能か確認
- `VERTEX_AI_LOCATION` のリージョンが正しいか確認（デフォルト: `us-central1`）

**Q: 「Model not found」エラーが出る**
- `VERTEX_AI_MODEL` の値を確認（デフォルト: `gemini-2.0-flash`）
- 利用可能なモデル名は Google Cloud Console の「Vertex AI > Model Garden」で確認できます
- リージョンによって利用可能なモデルが異なります

### デプロイ関連

**Q: GitHub Actions が失敗する**
- `FIREBASE_SERVICE_ACCOUNT_JSON` に JSON ファイルの中身全体がコピーされているか確認
- JSON に余分な改行や空白が含まれていないか確認

---

## 設定値クイックリファレンス

最終的に必要な設定値の一覧です：

| 設定値 | 取得元 | 手順 | 必須 |
|--------|--------|------|------|
| Firebase API Key | Firebase Console > プロジェクト設定 | 2.3 | 必須 |
| Firebase Auth Domain | Firebase Console > プロジェクト設定 | 2.3 | デフォルトあり |
| Firebase Project ID | Firebase Console > プロジェクト設定 | 2.3 | 必須 |
| Firebase Storage Bucket | Firebase Console > Storage | 5.2 | デフォルトあり |
| Firebase Messaging Sender ID | Firebase Console > プロジェクト設定 | 2.3 | 必須 |
| Firebase App ID | Firebase Console > プロジェクト設定 | 2.3 | 必須 |
| Service Account JSON | Google Cloud Console > サービスアカウント | 8.3 | 必須 |
| Firestore Database ID | Firebase Console > Firestore | 4.2 | デフォルト: `(default)` |
| Vertex AI Model | 任意に選択 | 7.3 | デフォルト: `gemini-2.0-flash` |
| Vertex AI Location | 任意に選択 | 7.3 | デフォルト: `us-central1` |
| Scheduler API Key | `openssl rand -hex 32` で生成 | 12.2 | 自動投稿使用時に必須 |
| X API Key | X Developer Portal | 10.3 | アプリ内で設定可 |
| X API Secret | X Developer Portal | 10.3 | アプリ内で設定可 |
| X Access Token | X Developer Portal | 10.4 | アプリ内で設定可 |
| X Access Token Secret | X Developer Portal | 10.4 | アプリ内で設定可 |
| Note Email | note.com アカウント | 11.1 | アプリ内で設定 |
| Note Password | note.com アカウント | 11.1 | アプリ内で設定 |
