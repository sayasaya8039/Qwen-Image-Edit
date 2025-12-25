import { Context, MiddlewareHandler } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

// 環境変数から認証情報を取得（デフォルト値あり）
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const SESSION_SECRET = process.env.SESSION_SECRET || 'qwen-image-edit-secret-key-change-in-production'

// セッションストレージ（メモリベース、本番ではRedis等を推奨）
const sessions = new Map<string, { username: string; createdAt: number }>()

// セッションの有効期限（24時間）
const SESSION_TTL = 24 * 60 * 60 * 1000

// セッションIDを生成
function generateSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// セッションを検証
function validateSession(sessionId: string | undefined): boolean {
  if (!sessionId) return false

  const session = sessions.get(sessionId)
  if (!session) return false

  // 期限切れチェック
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(sessionId)
    return false
  }

  return true
}

// 認証ミドルウェア
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const sessionId = getCookie(c, 'session_id')

  if (!validateSession(sessionId)) {
    return c.json({ error: true, message: '認証が必要です' }, 401)
  }

  await next()
}

// ログインハンドラー
export async function loginHandler(c: Context) {
  try {
    const body = await c.req.json()
    const { username, password } = body

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const sessionId = generateSessionId()
      sessions.set(sessionId, {
        username,
        createdAt: Date.now(),
      })

      setCookie(c, 'session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: SESSION_TTL / 1000,
        path: '/',
      })

      return c.json({
        success: true,
        message: 'ログインしました',
        user: { username },
      })
    }

    return c.json({ error: true, message: 'ユーザー名またはパスワードが正しくありません' }, 401)
  } catch (error) {
    return c.json({ error: true, message: 'リクエストの処理に失敗しました' }, 400)
  }
}

// ログアウトハンドラー
export async function logoutHandler(c: Context) {
  const sessionId = getCookie(c, 'session_id')

  if (sessionId) {
    sessions.delete(sessionId)
  }

  deleteCookie(c, 'session_id', { path: '/' })

  return c.json({ success: true, message: 'ログアウトしました' })
}

// セッション確認ハンドラー
export async function checkSessionHandler(c: Context) {
  const sessionId = getCookie(c, 'session_id')

  if (validateSession(sessionId)) {
    const session = sessions.get(sessionId!)
    return c.json({
      authenticated: true,
      user: { username: session?.username },
    })
  }

  return c.json({ authenticated: false }, 401)
}

// 古いセッションをクリーンアップ（定期実行用）
export function cleanupSessions() {
  const now = Date.now()
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL) {
      sessions.delete(id)
    }
  }
}

// 1時間ごとにセッションをクリーンアップ
setInterval(cleanupSessions, 60 * 60 * 1000)
