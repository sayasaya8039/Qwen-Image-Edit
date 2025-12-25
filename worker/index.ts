import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

import type { Env, BackendStatus } from './types'
import { authMiddleware, loginHandler, logoutHandler, checkSessionHandler } from './auth'
import {
  getAllModels,
  getModel,
  addModel,
  updateModel,
  deleteModel,
  getSettings,
  updateSettings,
} from './model-manager'

// Workers Sites マニフェスト
// @ts-expect-error - Workers Sites auto-generated
import manifest from '__STATIC_CONTENT_MANIFEST'

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('*', cors())

// 設定
const DEFAULT_PYTHON_SERVER_URL = 'http://localhost:8000'
const DEFAULT_HF_SPACE_URL = 'https://qwen-qwen-image-edit-2511.hf.space'
const BAGEL_SPACE_URL = 'https://bytedance-seed-bagel.hf.space'
const ZIMAGE_SPACE_URL = 'https://tongyi-mai-z-image-turbo.hf.space'
const FLUX2_SPACE_URL = 'https://black-forest-labs-flux-2-dev.hf.space'

// 日本語を含むかチェック（ひらがな、カタカナ、漢字）
function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)
}

// 日本語を英語に翻訳（MyMemory API使用 - 無料）
async function translateToEnglish(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`
    const res = await fetch(url)

    if (!res.ok) {
      console.error('Translation API error:', res.status)
      return text // 失敗時は元のテキストを返す
    }

    const data = await res.json() as {
      responseStatus: number
      responseData?: { translatedText?: string }
    }

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText
      console.log(`Translated: "${text}" → "${translated}"`)
      return translated
    }

    return text
  } catch (error) {
    console.error('Translation error:', error)
    return text // エラー時は元のテキストを返す
  }
}

// 大きな配列でも安全にBase64エンコード
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000 // 32KB chunks
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  return btoa(binary)
}

// バックエンドステータスをキャッシュ
let backendStatusCache: BackendStatus | null = null
let lastCheckTime = 0

// ローカルPythonサーバーのステータスチェック
async function checkLocalServer(pythonUrl: string): Promise<BackendStatus | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(`${pythonUrl}/health`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json() as Record<string, unknown>
      return {
        mode: 'local',
        cudaAvailable: (data.cuda_available as boolean) ?? false,
        directmlAvailable: (data.directml_available as boolean) ?? false,
        gpuVendor: (data.gpu_vendor as BackendStatus['gpuVendor']) ?? 'unknown',
        gpuName: (data.gpu_name as string) ?? '',
        gpuInfo: (data.gpu_info as string) ?? '',
        backend: (data.backend as string) ?? '',
        modelLoaded: (data.model_loaded as boolean) ?? false,
        lastCheck: Date.now(),
      }
    }
  } catch {
    // ローカルサーバーが利用不可
  }
  return null
}

// Replicate APIのステータスチェック
async function checkReplicateAPI(apiToken: string | undefined): Promise<BackendStatus | null> {
  if (!apiToken) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch('https://api.replicate.com/v1/models/qwen/qwen-image-edit-2511', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      return {
        mode: 'cloud',
        cudaAvailable: true,
        directmlAvailable: false,
        gpuVendor: 'nvidia',
        gpuName: 'Replicate Cloud GPU',
        gpuInfo: 'Replicate API - Qwen-Image-Edit-2511',
        backend: 'replicate',
        modelLoaded: true,
        lastCheck: Date.now(),
      }
    }
  } catch {
    // Replicate APIが利用不可
  }
  return null
}

// HuggingFace Spaceのステータスチェック（フォールバック用）
async function checkHFSpace(hfUrl: string): Promise<BackendStatus | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${hfUrl}/config`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      return {
        mode: 'cloud',
        cudaAvailable: true,
        directmlAvailable: false,
        gpuVendor: 'nvidia',
        gpuName: 'Cloud GPU (ZeroGPU)',
        gpuInfo: 'HuggingFace Spaces - ZeroGPU制限あり（不安定）',
        backend: 'huggingface',
        modelLoaded: true,
        lastCheck: Date.now(),
      }
    }
  } catch {
    // HF Spaceが利用不可
  }
  return null
}

// バックエンドの初期化
async function initBackend(env: Env): Promise<BackendStatus> {
  const pythonUrl = env.PYTHON_SERVER_URL || DEFAULT_PYTHON_SERVER_URL
  const hfUrl = env.HF_SPACE_URL || DEFAULT_HF_SPACE_URL

  // 1. ローカルサーバーを確認（最優先）
  const localStatus = await checkLocalServer(pythonUrl)
  if (localStatus) {
    backendStatusCache = localStatus
    lastCheckTime = Date.now()
    return localStatus
  }

  // 2. Replicate APIを確認（推奨クラウド）
  const replicateStatus = await checkReplicateAPI(env.REPLICATE_API_TOKEN)
  if (replicateStatus) {
    backendStatusCache = replicateStatus
    lastCheckTime = Date.now()
    return replicateStatus
  }

  // 3. フォールバック: HuggingFace Space（不安定）
  const hfStatus = await checkHFSpace(hfUrl)
  if (hfStatus) {
    backendStatusCache = hfStatus
    lastCheckTime = Date.now()
    return hfStatus
  }

  // 利用不可
  const unavailable: BackendStatus = {
    mode: 'unavailable',
    cudaAvailable: false,
    directmlAvailable: false,
    gpuVendor: 'unknown',
    gpuName: '',
    gpuInfo: '',
    backend: '',
    modelLoaded: false,
    lastCheck: Date.now(),
  }
  backendStatusCache = unavailable
  lastCheckTime = Date.now()
  return unavailable
}

// ============================
// Public API
// ============================

// ヘルスチェック
app.get('/api/health', async (c) => {
  // 30秒ごとに再確認
  if (!backendStatusCache || Date.now() - lastCheckTime > 30000) {
    await initBackend(c.env)
  }

  return c.json({
    status: backendStatusCache?.mode !== 'unavailable' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    backend: backendStatusCache,
  })
})

// 公開モデル一覧（有効なモデルのみ）
app.get('/api/models', async (c) => {
  try {
    const models = await getAllModels(c.env.MODELS_KV)
    const enabledModels = models.filter((m) => m.enabled)
    const settings = await getSettings(c.env.MODELS_KV)
    return c.json({
      models: enabledModels.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        type: m.type,
        isDefault: m.id === settings.activeModelId,
      })),
      activeModelId: settings.activeModelId,
    })
  } catch {
    return c.json({ error: true, message: 'モデル一覧の取得に失敗しました' }, 500)
  }
})

// ステータス詳細
app.get('/api/status', async (c) => {
  await initBackend(c.env)

  return c.json({
    backend: backendStatusCache,
    endpoints: {
      local: c.env.PYTHON_SERVER_URL || DEFAULT_PYTHON_SERVER_URL,
      cloud: c.env.HF_SPACE_URL || DEFAULT_HF_SPACE_URL,
    },
  })
})

// アスペクト比から幅と高さを計算
function calculateDimensions(aspectRatio: string, baseSize: number): { width: number; height: number } {
  const ratios: Record<string, [number, number]> = {
    '1:1': [1, 1],
    '16:9': [16, 9],
    '9:16': [9, 16],
    '4:3': [4, 3],
    '3:4': [3, 4],
    '3:2': [3, 2],
    '2:3': [2, 3],
  }

  const [w, h] = ratios[aspectRatio] || [1, 1]

  if (w >= h) {
    const width = baseSize
    const height = Math.round((baseSize * h) / w)
    return { width, height }
  } else {
    const height = baseSize
    const width = Math.round((baseSize * w) / h)
    return { width, height }
  }
}

// 画像生成/編集エンドポイント
app.post('/api/generate', async (c) => {
  try {
    const formData = await c.req.formData()
    let prompt = formData.get('prompt') as string
    const negativePrompt = (formData.get('negative_prompt') as string) || ' '
    const image1 = formData.get('image1') as File | null
    const image2 = formData.get('image2') as File | null
    const aspectRatio = (formData.get('aspect_ratio') as string) || '1:1'
    const resolution = parseInt((formData.get('resolution') as string) || '1024', 10)
    // modelId または model_id の両方をサポート
    const modelId = (formData.get('modelId') as string) || (formData.get('model_id') as string) || null

    if (!prompt) {
      return c.json({ error: true, message: 'プロンプトは必須です' }, 400)
    }

    // 選択されたモデルを取得
    let selectedModel = null
    if (modelId) {
      selectedModel = await getModel(c.env.MODELS_KV, modelId)
      if (!selectedModel || !selectedModel.enabled) {
        selectedModel = null
      }
    }

    // 寸法を計算
    const { width, height } = calculateDimensions(aspectRatio, resolution)

    // 日本語プロンプトを自動で英語に翻訳
    const originalPrompt = prompt
    if (containsJapanese(prompt)) {
      prompt = await translateToEnglish(prompt)
    }

    let result: string
    let usedBackend: string

    // モデルIDに基づいて処理を分岐
    const activeModelId = selectedModel?.id || modelId || 'qwen-image-edit'
    if (activeModelId === 'bagel-7b-mot') {
      // BAGEL モデルを使用
      if (image1) {
        result = await callBagelEditAPI(prompt, image1)
      } else {
        result = await callBagelTextToImageAPI(prompt)
      }
      usedBackend = 'bagel'
    } else if (activeModelId === 'z-image-turbo') {
      // Z-Image-Turbo モデルを使用
      result = await callZImageAPI(prompt)
      usedBackend = 'zimage'
    } else if (activeModelId === 'flux2-dev') {
      // FLUX.2 [dev] モデルを使用
      result = await callFlux2API(prompt, image1)
      usedBackend = 'flux2'
    } else {
      // Qwen系またはその他のモデル
      // バックエンドを確認
      if (!backendStatusCache || backendStatusCache.mode === 'unavailable') {
        await initBackend(c.env)
      }

      if (!backendStatusCache || backendStatusCache.mode === 'unavailable') {
        return c.json(
          {
            error: true,
            message: 'バックエンドが利用できません。',
          },
          503
        )
      }

      if (backendStatusCache.mode === 'local') {
        result = await callLocalAPI(
          c.env.PYTHON_SERVER_URL || DEFAULT_PYTHON_SERVER_URL,
          prompt,
          negativePrompt,
          image1,
          image2,
          width,
          height
        )
        usedBackend = 'local'
      } else {
        // モデルのタイプに応じてバックエンドを選択
        const modelType = selectedModel?.type || 'diffusers'

        // HuggingFace Cloudモデルの場合はGradio APIを使用
        if (modelType === 'cloud' || activeModelId === 'huggingface-cloud') {
          const hfUrl = selectedModel?.source || c.env.HF_SPACE_URL || DEFAULT_HF_SPACE_URL
          result = await callGradioAPI(
            hfUrl,
            prompt,
            negativePrompt,
            image1,
            image2,
            width,
            height
          )
          usedBackend = 'huggingface'
        } else if (backendStatusCache.backend === 'replicate') {
          // Replicate APIを使用
          if (activeModelId === 'stable-diffusion-v1-5') {
            // Stable Diffusion: HuggingFace Spaceを使用（Replicateでは利用不可）
            const SD_SPACE_URL = 'https://stabilityai-stable-diffusion.hf.space'
            result = await callStableDiffusionHF(
              SD_SPACE_URL,
              prompt,
              negativePrompt,
              width,
              height
            )
            usedBackend = 'huggingface'
          } else {
            // Qwen-Image-Edit: 画像編集（入力画像が必要）
            if (!image1 && !image2) {
              return c.json(
                {
                  error: true,
                  message: 'Qwen-Image-Editは画像編集モデルです。編集する画像をアップロードしてください。',
                },
                400
              )
            }
            result = await callReplicateAPI(
              c.env.REPLICATE_API_TOKEN!,
              prompt,
              image1,
              image2,
              aspectRatio
            )
            usedBackend = 'replicate'
          }
        } else {
          // フォールバック: HuggingFace Space
          result = await callGradioAPI(
            c.env.HF_SPACE_URL || DEFAULT_HF_SPACE_URL,
            prompt,
            negativePrompt,
            image1,
            image2,
            width,
            height
          )
          usedBackend = 'huggingface'
        }
      }
    }

    return c.json({
      image: result,
      backend: usedBackend,
      cuda: backendStatusCache?.cudaAvailable ?? false,
      prompt: prompt,
      originalPrompt: originalPrompt !== prompt ? originalPrompt : undefined,
      translated: originalPrompt !== prompt,
      model: selectedModel ? { id: selectedModel.id, name: selectedModel.name } : { id: activeModelId, name: activeModelId },
      modelId: activeModelId,
    })
  } catch (error) {
    console.error('Generation error:', error)
    return c.json(
      {
        error: true,
        message: error instanceof Error ? error.message : '生成に失敗しました',
      },
      500
    )
  }
})

// ローカルPython API呼び出し
async function callLocalAPI(
  pythonUrl: string,
  prompt: string,
  negativePrompt: string,
  image1: File | null,
  image2: File | null,
  width: number,
  height: number
): Promise<string> {
  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('negative_prompt', negativePrompt)
  formData.append('num_inference_steps', '40')
  formData.append('true_cfg_scale', '4.0')
  formData.append('guidance_scale', '1.0')
  formData.append('seed', '-1')
  formData.append('width', width.toString())
  formData.append('height', height.toString())

  if (image1) {
    formData.append('image1', image1)
  }
  if (image2) {
    formData.append('image2', image2)
  }

  const res = await fetch(`${pythonUrl}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' })) as { detail?: string }
    throw new Error(error.detail || 'ローカルサーバーでの生成に失敗しました')
  }

  const data = await res.json() as { image: string }
  return data.image
}

// Replicate API呼び出し
async function callReplicateAPI(
  apiToken: string,
  prompt: string,
  image1: File | null,
  image2: File | null,
  aspectRatio: string
): Promise<string> {
  // 画像をBase64 URLに変換
  const images: string[] = []

  if (image1) {
    const buffer = await image1.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    const mimeType = image1.type || 'image/png'
    images.push(`data:${mimeType};base64,${base64}`)
  }
  if (image2) {
    const buffer = await image2.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    const mimeType = image2.type || 'image/png'
    images.push(`data:${mimeType};base64,${base64}`)
  }

  // Replicate API呼び出し - モデルベースのエンドポイントを使用
  console.log('Calling Replicate API for qwen/qwen-image-edit-2511...')
  const createRes = await fetch('https://api.replicate.com/v1/models/qwen/qwen-image-edit-2511/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt,
        image: images.length > 0 ? images : undefined,
        aspect_ratio: aspectRatio,
        go_fast: true,
        output_format: 'webp',
        output_quality: 90,
      },
    }),
  })

  if (!createRes.ok) {
    const errorText = await createRes.text()
    console.error('Replicate API error:', createRes.status, errorText)
    try {
      const error = JSON.parse(errorText) as { detail?: string }
      throw new Error(error.detail || `Replicate APIエラー (${createRes.status})`)
    } catch (e) {
      if (e instanceof Error && e.message.includes('Replicate')) throw e
      throw new Error(`Replicate APIでの生成に失敗しました (${createRes.status}): ${errorText.substring(0, 100)}`)
    }
  }

  const prediction = await createRes.json() as {
    status: string
    output?: string | string[]
    error?: string
    urls?: { get: string }
  }

  // 同期モードで完了した場合
  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    // 出力URLから画像を取得してBase64に変換
    const imageRes = await fetch(outputUrl)
    const imageBuffer = await imageRes.arrayBuffer()
    const base64 = arrayBufferToBase64(imageBuffer)
    return `data:image/webp;base64,${base64}`
  }

  // 非同期モードの場合はポーリング
  if (prediction.urls?.get) {
    let attempts = 0
    const maxAttempts = 60 // 最大60回（約5分）

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)) // 5秒待機

      const pollRes = await fetch(prediction.urls!.get, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      })

      if (!pollRes.ok) {
        throw new Error('Replicate APIのポーリングに失敗しました')
      }

      const pollData = await pollRes.json() as {
        status: string
        output?: string | string[]
        error?: string
      }

      if (pollData.status === 'succeeded' && pollData.output) {
        const outputUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output
        const imageRes = await fetch(outputUrl)
        const imageBuffer = await imageRes.arrayBuffer()
        const base64 = arrayBufferToBase64(imageBuffer)
        return `data:image/webp;base64,${base64}`
      }

      if (pollData.status === 'failed') {
        throw new Error(pollData.error || 'Replicate APIでの生成に失敗しました')
      }

      attempts++
    }

    throw new Error('Replicate APIがタイムアウトしました')
  }

  if (prediction.error) {
    throw new Error(prediction.error)
  }

  throw new Error('Replicate APIからの応答が不正です')
}

// Replicate Stable Diffusion API呼び出し
async function callReplicateStableDiffusion(
  apiToken: string,
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number
): Promise<string> {
  // サイズを文字列形式に変換 (512x512, 768x768など)
  const imageDimensions = `${width}x${height}`

  // Replicate API呼び出し - モデルベースのエンドポイントを使用
  console.log('Calling Replicate API for stability-ai/stable-diffusion...')
  const createRes = await fetch('https://api.replicate.com/v1/models/stability-ai/stable-diffusion/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt,
        negative_prompt: negativePrompt || undefined,
        image_dimensions: imageDimensions,
        num_outputs: 1,
        num_inference_steps: 50,
        guidance_scale: 7.5,
        scheduler: 'K_EULER',
      },
    }),
  })

  if (!createRes.ok) {
    const errorText = await createRes.text()
    console.error('Stable Diffusion API error:', createRes.status, errorText)
    try {
      const error = JSON.parse(errorText) as { detail?: string }
      throw new Error(error.detail || `Stable Diffusion APIエラー (${createRes.status})`)
    } catch (e) {
      if (e instanceof Error && e.message.includes('Stable Diffusion')) throw e
      throw new Error(`Stable Diffusion APIでの生成に失敗しました (${createRes.status}): ${errorText.substring(0, 100)}`)
    }
  }

  const prediction = await createRes.json() as {
    status: string
    output?: string | string[]
    error?: string
    urls?: { get: string }
  }

  // 同期モードで完了した場合
  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    const imageRes = await fetch(outputUrl)
    const imageBuffer = await imageRes.arrayBuffer()
    const base64 = arrayBufferToBase64(imageBuffer)
    return `data:image/png;base64,${base64}`
  }

  // 非同期モードの場合はポーリング
  if (prediction.urls?.get) {
    let attempts = 0
    const maxAttempts = 60

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const pollRes = await fetch(prediction.urls!.get, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      })

      if (!pollRes.ok) {
        throw new Error('Stable Diffusion APIのポーリングに失敗しました')
      }

      const pollData = await pollRes.json() as {
        status: string
        output?: string | string[]
        error?: string
      }

      if (pollData.status === 'succeeded' && pollData.output) {
        const outputUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output
        const imageRes = await fetch(outputUrl)
        const imageBuffer = await imageRes.arrayBuffer()
        const base64 = arrayBufferToBase64(imageBuffer)
        return `data:image/png;base64,${base64}`
      }

      if (pollData.status === 'failed') {
        throw new Error(pollData.error || 'Stable Diffusion APIでの生成に失敗しました')
      }

      attempts++
    }

    throw new Error('Stable Diffusion APIがタイムアウトしました')
  }

  if (prediction.error) {
    throw new Error(prediction.error)
  }

  throw new Error('Stable Diffusion APIからの応答が不正です')
}

// Gradio API呼び出し (HuggingFace Space) - Gradio 6.x対応
async function callGradioAPI(
  hfUrl: string,
  prompt: string,
  _negativePrompt: string,
  image1: File | null,
  image2: File | null,
  width: number,
  height: number
): Promise<string> {
  // 画像をGradio GalleryImage形式に変換
  const galleryImages: Array<{ image: { url: string; meta: { _type: string } } }> = []

  if (image1) {
    const buffer = await image1.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    const mimeType = image1.type || 'image/png'
    galleryImages.push({
      image: {
        url: `data:${mimeType};base64,${base64}`,
        meta: { _type: 'gradio.FileData' },
      },
    })
  }
  if (image2) {
    const buffer = await image2.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    const mimeType = image2.type || 'image/png'
    galleryImages.push({
      image: {
        url: `data:${mimeType};base64,${base64}`,
        meta: { _type: 'gradio.FileData' },
      },
    })
  }

  // Gradio 6.x API: /gradio_api/call/{api_name}
  // inputs: [gallery, prompt, seed, randomize_seed, true_cfg, steps, height, width, rewrite_prompt]
  const callRes = await fetch(`${hfUrl}/gradio_api/call/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        galleryImages.length > 0 ? galleryImages : [],
        prompt,
        0,      // seed
        true,   // randomize_seed
        4.0,    // true_cfg_scale
        40,     // num_inference_steps
        height, // height
        width,  // width
        true,   // rewrite_prompt
      ],
    }),
  })

  if (!callRes.ok) {
    const errorText = await callRes.text()
    console.error('Gradio call error:', errorText)
    throw new Error('HuggingFace Spaceへの接続に失敗しました')
  }

  const callData = await callRes.json() as { event_id: string }
  const eventId = callData.event_id

  // SSE結果をポーリング
  const resultRes = await fetch(`${hfUrl}/gradio_api/call/infer/${eventId}`)

  if (!resultRes.ok) {
    throw new Error('結果の取得に失敗しました')
  }

  const text = await resultRes.text()
  console.log('Qwen raw response:', text.substring(0, 500))
  
  // エラーイベントのチェック
  if (text.includes('event: error')) {
    console.error('Qwen Space returned error event - likely ZeroGPU quota exceeded')
    throw new Error('Qwen SpaceのZeroGPU割り当てが一時的に枯渇しています。しばらく待ってから再試行するか、Z-Image-Turboなど他のモデルをお試しください。')
  }
  
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6)
        // data: null の場合はスキップ
        if (jsonStr === 'null') {
          console.log('Qwen: data is null, skipping')
          continue
        }
        
        const data = JSON.parse(jsonStr) as unknown[]
        // 結果は [gallery_output, seed_output] の形式
        if (Array.isArray(data) && data.length > 0) {
          const galleryOutput = data[0] as Array<{ image?: { url?: string; path?: string } }>
          if (Array.isArray(galleryOutput) && galleryOutput.length > 0) {
            const firstImage = galleryOutput[0]
            const imageUrl = firstImage.image?.url || firstImage.image?.path
            if (imageUrl) {
              // 相対URLの場合は完全なURLに変換
              const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${hfUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
              console.log('Qwen: fetching image from:', fullUrl)
              const imageRes = await fetch(fullUrl)
              if (!imageRes.ok) {
                console.error('Qwen: image fetch failed:', imageRes.status)
                throw new Error('画像の取得に失敗しました')
              }
              const imageBuffer = await imageRes.arrayBuffer()
              const base64 = arrayBufferToBase64(imageBuffer)
              console.log('Qwen: success, base64 length:', base64.length)
              return `data:image/webp;base64,${base64}`
            }
          }
        }
      } catch (e) {
        console.error('Qwen parse error:', e)
        // JSONパースエラー以外は伝播
        if (e instanceof SyntaxError) {
          continue
        }
        throw e
      }
    }
  }

  throw new Error('画像の生成に失敗しました。HuggingFace SpaceのZeroGPU制限により、クラウド生成が利用できない場合があります。Z-Image-Turboなど他のモデルを選択するか、ローカルPythonサーバーの使用を検討してください。')
}

// BAGEL Text-to-Image API呼び出し
async function callBagelTextToImageAPI(prompt: string): Promise<string> {
  console.log('Calling BAGEL Text-to-Image API...')

  // Gradio API呼び出し
  const queueRes = await fetch(`${BAGEL_SPACE_URL}/gradio_api/call/text_to_image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        prompt, // prompt
        false, // show_thinking
        4.0, // cfg_text_scale
        0.4, // cfg_interval
        3.0, // timestep_shift
        50, // num_timesteps
        0.0, // cfg_renorm_min
        'global', // cfg_renorm_type
        1024, // max_think_token_n
        false, // do_sample
        0.3, // text_temperature
        0, // seed (0 = random)
        '1:1', // image_ratio
      ],
    }),
  })

  if (!queueRes.ok) {
    const errorText = await queueRes.text()
    console.error('BAGEL queue error:', errorText)
    throw new Error('BAGEL APIへの接続に失敗しました')
  }

  const queueData = await queueRes.json() as { event_id: string }
  const eventId = queueData.event_id

  // イベントストリームから結果を取得
  const streamRes = await fetch(`${BAGEL_SPACE_URL}/gradio_api/call/text_to_image/${eventId}`)

  if (!streamRes.ok) {
    throw new Error('BAGEL結果の取得に失敗しました')
  }

  const text = await streamRes.text()
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6)) as unknown[]
        // data[0] が画像、data[1] が thinking text
        if (Array.isArray(data) && data[0]) {
          const imageData = data[0] as string | { url?: string }
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
              return imageData
            }
            // URL形式の場合は画像をフェッチしてBase64に変換
            const imageRes = await fetch(imageData)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          }
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  throw new Error('BAGEL画像の生成に失敗しました')
}

// BAGEL Image Edit API呼び出し
async function callBagelEditAPI(prompt: string, image: File): Promise<string> {
  console.log('Calling BAGEL Image Edit API...')

  // 画像をBase64に変換
  const buffer = await image.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  const mimeType = image.type || 'image/png'
  const imageDataUrl = `data:${mimeType};base64,${base64}`

  // Gradio API呼び出し
  const queueRes = await fetch(`${BAGEL_SPACE_URL}/gradio_api/call/edit_image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        imageDataUrl, // image
        prompt, // prompt
        false, // show_thinking
        4.0, // cfg_text_scale
        2.0, // cfg_img_scale
        3.0, // timestep_shift
        50, // num_timesteps
        0.0, // cfg_renorm_min
        'text_channel', // cfg_renorm_type
        1024, // max_think_token_n
        false, // do_sample
        0.3, // text_temperature
        0, // seed
      ],
    }),
  })

  if (!queueRes.ok) {
    const errorText = await queueRes.text()
    console.error('BAGEL edit queue error:', errorText)
    throw new Error('BAGEL Edit APIへの接続に失敗しました')
  }

  const queueData = await queueRes.json() as { event_id: string }
  const eventId = queueData.event_id

  // イベントストリームから結果を取得
  const streamRes = await fetch(`${BAGEL_SPACE_URL}/gradio_api/call/edit_image/${eventId}`)

  if (!streamRes.ok) {
    throw new Error('BAGEL Edit結果の取得に失敗しました')
  }

  const text = await streamRes.text()
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6)) as unknown[]
        if (Array.isArray(data) && data[0]) {
          const imageData = data[0] as string | { url?: string }
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
              return imageData
            }
            const imageRes = await fetch(imageData)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          }
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  throw new Error('BAGEL画像の編集に失敗しました')
}

// Z-Image-Turbo API呼び出し
async function callZImageAPI(prompt: string): Promise<string> {
  console.log('Calling Z-Image-Turbo API...')

  // Gradio API呼び出し - 正しいパラメータ形式
  // [prompt, resolution, seed, steps, shift, random_seed, gallery_images]
  const queueRes = await fetch(`${ZIMAGE_SPACE_URL}/gradio_api/call/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        prompt,                  // prompt: string
        '1024x1024 ( 1:1 )',    // resolution: string (選択肢から)
        42,                      // seed: integer
        8,                       // steps: number (1-100, default 8)
        3.0,                     // shift: number (1.0-10.0, default 3.0)
        true,                    // random_seed: boolean
        [],                      // gallery_images: array
      ],
    }),
  })

  if (!queueRes.ok) {
    const errorText = await queueRes.text()
    console.error('Z-Image queue error:', errorText)
    throw new Error('Z-Image APIへの接続に失敗しました')
  }

  const queueData = await queueRes.json() as { event_id: string }
  const eventId = queueData.event_id

  // イベントストリームから結果を取得
  const streamRes = await fetch(`${ZIMAGE_SPACE_URL}/gradio_api/call/generate/${eventId}`)

  if (!streamRes.ok) {
    throw new Error('Z-Image結果の取得に失敗しました')
  }

  const text = await streamRes.text()
  console.log('Z-Image raw response:', text)
  const lines = text.split('\n')

  // エラーイベントのチェック
  if (text.includes('event: error')) {
    console.error('Z-Image returned error event')
    throw new Error('Z-Image Space一時的にエラー状態です。後でお試しください。')
  }

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6)
        console.log('Z-Image parsing JSON:', jsonStr.substring(0, 200))
        const data = JSON.parse(jsonStr)
        
        // 応答形式: [GalleryData, seedText, seedNumber]
        // GalleryData = [{image: {path, url, ...}, caption}, ...]
        if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
          const galleryData = data[0]
          console.log('Z-Image gallery data length:', galleryData.length)
          if (galleryData.length > 0) {
            const firstImage = galleryData[0]
            const imageInfo = firstImage?.image
            console.log('Z-Image image info:', JSON.stringify(imageInfo).substring(0, 200))
            
            if (imageInfo?.url) {
              console.log('Z-Image fetching URL:', imageInfo.url)
              const imageRes = await fetch(imageInfo.url)
              if (!imageRes.ok) {
                console.error('Z-Image image fetch failed:', imageRes.status)
                throw new Error('画像の取得に失敗しました')
              }
              const imageBuffer = await imageRes.arrayBuffer()
              const base64 = arrayBufferToBase64(imageBuffer)
              console.log('Z-Image success, base64 length:', base64.length)
              return `data:image/png;base64,${base64}`
            } else if (imageInfo?.path) {
              // pathがURLの場合
              if (imageInfo.path.startsWith('http')) {
                console.log('Z-Image fetching path as URL:', imageInfo.path)
                const imageRes = await fetch(imageInfo.path)
                if (!imageRes.ok) {
                  console.error('Z-Image image fetch from path failed:', imageRes.status)
                  throw new Error('画像の取得に失敗しました')
                }
                const imageBuffer = await imageRes.arrayBuffer()
                const base64 = arrayBufferToBase64(imageBuffer)
                return `data:image/png;base64,${base64}`
              } else {
                // pathからURLを構築
                const fullUrl = `${ZIMAGE_SPACE_URL}/gradio_api/file=${imageInfo.path}`
                console.log('Z-Image constructing URL from path:', fullUrl)
                const imageRes = await fetch(fullUrl)
                if (!imageRes.ok) {
                  console.error('Z-Image image fetch from constructed URL failed:', imageRes.status)
                  throw new Error('画像の取得に失敗しました')
                }
                const imageBuffer = await imageRes.arrayBuffer()
                const base64 = arrayBufferToBase64(imageBuffer)
                return `data:image/png;base64,${base64}`
              }
            }
          }
        }
        
        // フォールバック: 古い形式のチェック
        if (Array.isArray(data) && data[0]) {
          const imageData = data[0]
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
              return imageData
            }
            if (imageData.startsWith('http')) {
              const imageRes = await fetch(imageData)
              const imageBuffer = await imageRes.arrayBuffer()
              const base64 = arrayBufferToBase64(imageBuffer)
              return `data:image/png;base64,${base64}`
            }
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          }
        }
      } catch (e) {
        console.error('Z-Image parse/fetch error:', e)
        throw e  // エラーを伝播
      }
    }
  }

  console.error('Z-Image: No valid data found in response')
  throw new Error('Z-Image画像の生成に失敗しました')
}

// Stable Diffusion HuggingFace Space API呼び出し
async function callStableDiffusionHF(
  spaceUrl: string,
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number
): Promise<string> {
  console.log('Calling Stable Diffusion HuggingFace Space...')

  // 多くのSD SpaceはGradio APIを使用
  // stabilityai/stable-diffusion-2-1 形式のAPIを想定
  const queueRes = await fetch(`${spaceUrl}/gradio_api/call/infer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        prompt,                    // prompt
        negativePrompt || '',      // negative_prompt
        7.5,                       // guidance_scale
        50,                        // num_inference_steps
        width,                     // width
        height,                    // height
        0,                         // seed (0 = random)
      ],
    }),
  })

  if (!queueRes.ok) {
    const errorText = await queueRes.text()
    console.error('Stable Diffusion HF queue error:', errorText)
    // Spaceが利用不可の場合、Z-Image-Turboにフォールバック
    console.log('Falling back to Z-Image-Turbo...')
    return await callZImageAPI(prompt)
  }

  const queueData = await queueRes.json() as { event_id: string }
  const eventId = queueData.event_id

  // イベントストリームから結果を取得
  const streamRes = await fetch(`${spaceUrl}/gradio_api/call/infer/${eventId}`)

  if (!streamRes.ok) {
    console.error('Stable Diffusion HF stream error, falling back to Z-Image-Turbo')
    return await callZImageAPI(prompt)
  }

  const text = await streamRes.text()
  console.log('Stable Diffusion HF response:', text.substring(0, 300))

  // エラーイベントのチェック
  if (text.includes('event: error')) {
    console.error('Stable Diffusion Space returned error, falling back to Z-Image-Turbo')
    return await callZImageAPI(prompt)
  }

  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonStr = line.slice(6)
        if (jsonStr === 'null') continue

        const data = JSON.parse(jsonStr)
        if (Array.isArray(data) && data[0]) {
          const imageData = data[0]
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
              return imageData
            }
            if (imageData.startsWith('http')) {
              const imageRes = await fetch(imageData)
              const imageBuffer = await imageRes.arrayBuffer()
              const base64 = arrayBufferToBase64(imageBuffer)
              return `data:image/png;base64,${base64}`
            }
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          } else if (imageData?.path) {
            const fullUrl = imageData.path.startsWith('http') 
              ? imageData.path 
              : `${spaceUrl}/gradio_api/file=${imageData.path}`
            const imageRes = await fetch(fullUrl)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          }
        }
      } catch (e) {
        console.error('Stable Diffusion HF parse error:', e)
      }
    }
  }

  // パース失敗時はZ-Image-Turboにフォールバック
  console.log('Stable Diffusion HF parse failed, falling back to Z-Image-Turbo')
  return await callZImageAPI(prompt)
}

// FLUX.2 API呼び出し
async function callFlux2API(prompt: string, image: File | null): Promise<string> {
  console.log('Calling FLUX.2 API...')

  // 画像をBase64に変換（入力画像がある場合）
  const inputImages: Array<{ url: string }> = []
  if (image) {
    const buffer = await image.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)
    const mimeType = image.type || 'image/png'
    inputImages.push({ url: `data:${mimeType};base64,${base64}` })
  }

  // Gradio API呼び出し
  const queueRes = await fetch(`${FLUX2_SPACE_URL}/gradio_api/call/infer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        prompt,           // prompt
        inputImages,      // input_images
        0,                // seed
        true,             // randomize_seed
        1024,             // width
        1024,             // height
        30,               // num_inference_steps
        4.0,              // guidance_scale
        true,             // prompt_upsampling
      ],
    }),
  })

  if (!queueRes.ok) {
    const errorText = await queueRes.text()
    console.error('FLUX.2 queue error:', errorText)
    throw new Error('FLUX.2 APIへの接続に失敗しました')
  }

  const queueData = await queueRes.json() as { event_id: string }
  const eventId = queueData.event_id

  // イベントストリームから結果を取得
  const streamRes = await fetch(`${FLUX2_SPACE_URL}/gradio_api/call/infer/${eventId}`)

  if (!streamRes.ok) {
    throw new Error('FLUX.2結果の取得に失敗しました')
  }

  const text = await streamRes.text()
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6))
        // FLUX.2 returns [image, seed, enhanced_prompt]
        if (Array.isArray(data) && data[0]) {
          const imageData = data[0]
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
              return imageData
            }
            const imageRes = await fetch(imageData)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = arrayBufferToBase64(imageBuffer)
            return `data:image/png;base64,${base64}`
          }
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  throw new Error('FLUX.2画像の生成に失敗しました')
}

// ============================
// 認証API
// ============================

app.post('/api/auth/login', loginHandler)
app.post('/api/auth/logout', logoutHandler)
app.get('/api/auth/check', checkSessionHandler)

// ============================
// 管理者API（認証必須）
// ============================

app.get('/api/admin/models', authMiddleware, async (c) => {
  try {
    const models = await getAllModels(c.env.MODELS_KV)
    return c.json({ models })
  } catch {
    return c.json({ error: true, message: 'モデル一覧の取得に失敗しました' }, 500)
  }
})

app.get('/api/admin/models/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const model = await getModel(c.env.MODELS_KV, id)
    if (!model) {
      return c.json({ error: true, message: 'モデルが見つかりません' }, 404)
    }
    return c.json({ model })
  } catch {
    return c.json({ error: true, message: 'モデルの取得に失敗しました' }, 500)
  }
})

app.post('/api/admin/models', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { name, type, source, description, backends, isDefault, enabled } = body

    if (!name || !type || !source) {
      return c.json({ error: true, message: '必須項目が不足しています' }, 400)
    }

    const newModel = await addModel(c.env.MODELS_KV, {
      name,
      type,
      source,
      description: description || '',
      backends: backends || ['cpu'],
      isDefault: isDefault || false,
      enabled: enabled !== false,
    })

    return c.json({ model: newModel }, 201)
  } catch (error) {
    return c.json(
      { error: true, message: error instanceof Error ? error.message : 'モデルの追加に失敗しました' },
      400
    )
  }
})

app.put('/api/admin/models/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    const updatedModel = await updateModel(c.env.MODELS_KV, id, body)
    return c.json({ model: updatedModel })
  } catch (error) {
    return c.json(
      { error: true, message: error instanceof Error ? error.message : 'モデルの更新に失敗しました' },
      400
    )
  }
})

app.delete('/api/admin/models/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    await deleteModel(c.env.MODELS_KV, id)
    return c.json({ success: true, message: 'モデルを削除しました' })
  } catch (error) {
    return c.json(
      { error: true, message: error instanceof Error ? error.message : 'モデルの削除に失敗しました' },
      400
    )
  }
})

app.get('/api/admin/settings', authMiddleware, async (c) => {
  try {
    const settings = await getSettings(c.env.MODELS_KV)
    return c.json({ settings })
  } catch {
    return c.json({ error: true, message: '設定の取得に失敗しました' }, 500)
  }
})

app.put('/api/admin/settings', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const updatedSettings = await updateSettings(c.env.MODELS_KV, body)
    return c.json({ settings: updatedSettings })
  } catch (error) {
    return c.json(
      { error: true, message: error instanceof Error ? error.message : '設定の更新に失敗しました' },
      400
    )
  }
})

// 静的ファイル配信
app.get('/assets/*', serveStatic({ manifest }))
app.get('/downloads/*', serveStatic({ manifest }))

// SPAフォールバック
app.get('*', serveStatic({ path: './index.html', manifest }))

export default app
