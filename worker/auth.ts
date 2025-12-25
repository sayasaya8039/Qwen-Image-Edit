import type { Context, MiddlewareHandler } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Env, Session } from './types'

// セッションの有効期限（24時間）
const SESSION_TTL = 24 * 60 * 60

// セッションIDを生成
function generateSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// セッションを検証
async function validateSession(
  sessionId: string | undefined,
  kv: Env['SESSIONS_KV']
): Promise<Session | null> {
  if (!sessionId) return null

  try {
    const session = await kv.get(sessionId, 'json')
    if (!session) return null

    const sessionData = session as Session

    // 期限切れチェック
    if (Date.now() - sessionData.createdAt > SESSION_TTL * 1000) {
      await kv.delete(sessionId)
      return null
    }

    return sessionData
  } catch {
    return null
  }
}

// 認証ミドルウェア
export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  const session = await validateSession(sessionId, c.env.SESSIONS_KV)

  if (!session) {
    return c.json({ error: true, message: '認証が必要です' }, 401)
  }

  await next()
}

// ログインハンドラー
export async function loginHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json()
    const { username, password } = body

    const adminUsername = c.env.ADMIN_USERNAME || 'admin'
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin123'

    if (username === adminUsername && password === adminPassword) {
      const sessionId = generateSessionId()
      const session: Session = {
        username,
        createdAt: Date.now(),
      }

      // KVにセッションを保存
      await c.env.SESSIONS_KV.put(sessionId, JSON.stringify(session), {
        expirationTtl: SESSION_TTL,
      })

      setCookie(c, 'session_id', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: SESSION_TTL,
        path: '/',
      })

      return c.json({
        success: true,
        message: 'ログインしました',
        user: { username },
      })
    }

    return c.json({ error: true, message: 'ユーザー名またはパスワードが正しくありません' }, 401)
  } catch {
    return c.json({ error: true, message: 'リクエストの処理に失敗しました' }, 400)
  }
}

// ログアウトハンドラー
export async function logoutHandler(c: Context<{ Bindings: Env }>) {
  const sessionId = getCookie(c, 'session_id')

  if (sessionId) {
    await c.env.SESSIONS_KV.delete(sessionId)
  }

  deleteCookie(c, 'session_id', { path: '/' })

  return c.json({ success: true, message: 'ログアウトしました' })
}

// セッション確認ハンドラー
export async function checkSessionHandler(c: Context<{ Bindings: Env }>) {
  const sessionId = getCookie(c, 'session_id')
  const session = await validateSession(sessionId, c.env.SESSIONS_KV)

  if (session) {
    return c.json({
      authenticated: true,
      user: { username: session.username },
    })
  }

  return c.json({ authenticated: false }, 401)
}
