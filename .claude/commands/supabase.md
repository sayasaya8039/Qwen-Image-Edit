---
description: Supabase開発支援・CLIリファレンス
allowed-tools: Bash(bun:*), Bash(bunx:*), Bash(npx:*), Bash(supabase:*), Read, Write, Edit, Glob, Grep, mcp__context7__*
argument-hint: [サブコマンド/操作]
---

Supabase（オープンソースFirebase代替）の開発を支援します。

## Supabaseとは

- **PostgreSQL**: フルマネージドリレーショナルDB
- **認証**: GoTrue（JWT、OAuth、Magic Link）
- **ストレージ**: S3互換ファイルストレージ
- **リアルタイム**: WebSocket購読
- **Edge Functions**: Deno Runtime
- **Auto API**: REST/GraphQL自動生成
- **pgvector**: AI/ベクトル検索対応

## Firebase → Supabase 移行ガイド

| Firebase | Supabase | 備考 |
|----------|----------|------|
| Firestore | PostgreSQL | SQLクエリ可能 |
| Firebase Auth | GoTrue | JWT、多様なプロバイダー |
| Cloud Storage | Supabase Storage | S3互換 |
| Realtime DB | Realtime | WebSocket |
| Cloud Functions | Edge Functions | Deno Runtime |

## クイックリファレンス

### CLIインストール
```bash
# グローバルインストール
bun add -g supabase

# プロジェクトローカル
bun add -D supabase
```

### プロジェクト初期化
```bash
# ローカル開発環境セットアップ
supabase init

# Supabaseプロジェクトにリンク
supabase link --project-ref <project-id>

# ローカルDB起動（Docker必須）
supabase start

# ローカルDB停止
supabase stop
```

### マイグレーション
```bash
# 新規マイグレーション作成
supabase migration new <name>

# マイグレーション適用
supabase db push

# DBリセット
supabase db reset

# 差分確認
supabase db diff
```

### Edge Functions
```bash
# 新規Function作成
supabase functions new <name>

# ローカル実行
supabase functions serve

# デプロイ
supabase functions deploy <name>
```

### 型生成
```bash
# TypeScript型定義を生成
supabase gen types typescript --local > src/types/database.ts

# リモートDBから生成
supabase gen types typescript --project-id <id> > src/types/database.ts
```

## クライアント設定

### インストール
```bash
bun add @supabase/supabase-js
```

### 初期化（TypeScript）
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
```

### 基本操作
```typescript
// SELECT
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)

// INSERT
const { data, error } = await supabase
  .from('posts')
  .insert({ title: 'Hello', content: 'World' })
  .select()

// UPDATE
const { data, error } = await supabase
  .from('posts')
  .update({ title: 'Updated' })
  .eq('id', postId)

// DELETE
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId)
```

### 認証
```typescript
// サインアップ
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// ログイン
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
})

// ログアウト
await supabase.auth.signOut()

// セッション取得
const { data: { session } } = await supabase.auth.getSession()
```

### ストレージ
```typescript
// アップロード
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('user1/avatar.png', file)

// ダウンロードURL取得
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('user1/avatar.png')

// 削除
await supabase.storage
  .from('avatars')
  .remove(['user1/avatar.png'])
```

### リアルタイム購読
```typescript
// テーブル変更を購読
const channel = supabase
  .channel('posts-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe()

// 購読解除
supabase.removeChannel(channel)
```

## 環境変数

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # サーバーサイドのみ
```

## Row Level Security (RLS)

```sql
-- RLS有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ポリシー作成（認証ユーザーのみ読み取り可）
CREATE POLICY "Users can read own posts"
ON posts FOR SELECT
USING (auth.uid() = user_id);

-- ポリシー作成（認証ユーザーのみ作成可）
CREATE POLICY "Users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

## 実行内容

1. **$ARGUMENTS** の内容に応じて適切なSupabase操作を実行
2. context7で最新のSupabase APIを確認
3. 型定義を自動生成
4. RLSポリシーを適切に設定
