import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from 'bun'
import { Client } from '@gradio/client'

import { authMiddleware, loginHandler, logoutHandler, checkSessionHandler } from './auth'
import {
  getAllModels,
  getModel,
  addModel,
  updateModel,
  deleteModel,
  getSettings,
  updateSettings,
  type ModelConfig,
} from './model-manager'

const app = new Hono()

// ミドルウェア
app.use('*', logger())
app.use('*', cors())

// 設定
const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:8000'
const BAGEL_LOCAL_URL = process.env.BAGEL_LOCAL_URL || 'http://localhost:3002'
const ZIMAGE_LOCAL_URL = process.env.ZIMAGE_LOCAL_URL || 'http://localhost:3003'
const UPSCALE_LOCAL_URL = process.env.UPSCALE_LOCAL_URL || 'http://localhost:3004'
const HF_SPACE_URL = 'https://qwen-qwen-image-edit-2511.hf.space'
const BAGEL_SPACE_URL = 'https://bytedance-seed-bagel.hf.space'
const ZIMAGE_SPACE_URL = 'https://tongyi-mai-z-image-turbo.hf.space'
const FLUX2_SPACE_URL = 'https://black-forest-labs-flux-2-dev.hf.space'
const FLUX2_LOCAL_URL = process.env.FLUX2_LOCAL_URL || 'http://localhost:3005'
const LTX2_SPACE_URL = 'https://sayasaya11-ltx-2-video.hf.space'

// バックエンドの状態
interface BackendStatus {
  mode: 'local' | 'cloud' | 'unavailable'
  cudaAvailable: boolean
  directmlAvailable: boolean
  gpuVendor: 'nvidia' | 'amd' | 'intel' | 'unknown'
  gpuName: string
  gpuInfo: string
  backend: string
  modelLoaded: boolean
  lastCheck: number
}

let backendStatus: BackendStatus = {
  mode: 'unavailable',
  cudaAvailable: false,
  directmlAvailable: false,
  gpuVendor: 'unknown',
  gpuName: '',
  gpuInfo: '',
  backend: '',
  modelLoaded: false,
  lastCheck: 0,
}

// BAGEL バックエンドの状態
interface BagelBackendStatus {
  mode: 'local' | 'cloud' | 'unavailable'
  modelLoaded: boolean
  quantization: string
  lastCheck: number
}

let bagelBackendStatus: BagelBackendStatus = {
  mode: 'unavailable',
  modelLoaded: false,
  quantization: '',
  lastCheck: 0,
}

// ローカルPythonサーバーのステータスチェック
async function checkLocalServer(): Promise<boolean> {
  try {
    const res = await fetch(`${PYTHON_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      backendStatus = {
        mode: 'local',
        cudaAvailable: data.cuda_available ?? false,
        directmlAvailable: data.directml_available ?? false,
        gpuVendor: data.gpu_vendor ?? 'unknown',
        gpuName: data.gpu_name ?? '',
        gpuInfo: data.gpu_info ?? '',
        backend: data.backend ?? '',
        modelLoaded: data.model_loaded ?? false,
        lastCheck: Date.now(),
      }
      return true
    }
  } catch {
    // ローカルサーバーが利用不可
  }
  return false
}

// HuggingFace Spaceのステータスチェック
async function checkHFSpace(): Promise<boolean> {
  try {
    const res = await fetch(`${HF_SPACE_URL}/config`, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      backendStatus = {
        mode: 'cloud',
        cudaAvailable: true, // HF Spaceは常にGPUあり
        directmlAvailable: false,
        gpuVendor: 'nvidia',
        gpuName: 'Cloud GPU',
        gpuInfo: 'HuggingFace Spaces (Cloud GPU)',
        backend: 'cloud',
        modelLoaded: true,
        lastCheck: Date.now(),
      }
      return true
    }
  } catch {
    // HF Spaceが利用不可
  }
  return false
}

// BAGELローカルサーバーのステータスチェック
async function checkBagelLocalServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BAGEL_LOCAL_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      bagelBackendStatus = {
        mode: 'local',
        modelLoaded: data.status === 'ok',
        quantization: data.device_info?.quantization || '',
        lastCheck: Date.now(),
      }
      return bagelBackendStatus.modelLoaded
    }
  } catch {
    // BAGEL ローカルサーバーが利用不可
  }
  return false
}

// BAGELバックエンドの初期化
async function initBagelBackend() {
  // まずローカルサーバーを確認
  if (await checkBagelLocalServer()) {
    console.log(`✓ BAGELローカルサーバー利用可能 (${bagelBackendStatus.quantization})`)
    return
  }

  // フォールバック: クラウド
  bagelBackendStatus = {
    mode: 'cloud',
    modelLoaded: true,
    quantization: 'cloud',
    lastCheck: Date.now(),
  }
  console.log('✓ BAGELクラウドAPI利用可能')
}

// バックエンドの初期化
async function initBackend() {
  console.log('バックエンドの状態を確認中...')

  // まずローカルサーバーを確認
  if (await checkLocalServer()) {
    console.log(`✓ ローカルサーバー利用可能: ${backendStatus.cudaInfo}`)
    return
  }

  // フォールバック: HuggingFace Space
  if (await checkHFSpace()) {
    console.log('✓ HuggingFace Spaces利用可能 (クラウドGPU)')
    return
  }

  console.log('⚠ 利用可能なバックエンドがありません')
  backendStatus.mode = 'unavailable'
}

// 起動時にバックエンド確認
initBackend()

// ヘルスチェック
app.get('/api/health', async (c) => {
  // 30秒ごとに再確認
  if (Date.now() - backendStatus.lastCheck > 30000) {
    await initBackend()
  }

  return c.json({
    status: backendStatus.mode !== 'unavailable' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    backend: backendStatus,
  })
})

// ステータス詳細
app.get('/api/status', async (c) => {
  // 最新状態を取得
  await initBackend()

  return c.json({
    backend: backendStatus,
    endpoints: {
      local: PYTHON_SERVER_URL,
      cloud: HF_SPACE_URL,
    },
  })
})

// 利用可能なモデル一覧（認証不要）
app.get('/api/models', (c) => {
  try {
    // 有効なモデルをすべて返す（cloud + local）
    const models = getAllModels().filter((m) => m.enabled)
    // デフォルトモデルを設定（最初のモデルをデフォルトに）
    if (models.length > 0 && !models.some((m) => m.isDefault)) {
      models[0].isDefault = true
    }
    return c.json({ models })
  } catch (error) {
    return c.json({ error: true, message: 'モデル一覧の取得に失敗しました' }, 500)
  }
})

// 画像生成/編集エンドポイント
app.post('/api/generate', async (c) => {
  try {
    const formData = await c.req.formData()
    const prompt = formData.get('prompt') as string
    const negativePrompt = (formData.get('negative_prompt') as string) || ' '
    const mode = formData.get('mode') as string
    const image1 = formData.get('image1') as File | null
    const image2 = formData.get('image2') as File | null
    const modelId = (formData.get('modelId') as string) || 'qwen-image-edit'

    if (!prompt) {
      return c.json({ error: true, message: 'プロンプトは必須です' }, 400)
    }

    console.log('Processing request:', {
      prompt: prompt.slice(0, 50),
      mode,
      modelId,
      hasImage1: !!image1,
      hasImage2: !!image2,
      backend: backendStatus.mode,
    })

    let result: string

    let usedBackend = ''

    // モデルIDに基づいて処理を分岐
    if (modelId === 'bagel-7b-mot') {
      // BAGELバックエンドを確認
      if (Date.now() - bagelBackendStatus.lastCheck > 30000) {
        await initBagelBackend()
      }

      if (bagelBackendStatus.mode === 'local' && bagelBackendStatus.modelLoaded) {
        // ローカルBAGELサーバーを使用
        result = await callBagelLocalAPI(prompt, image1)
        usedBackend = 'bagel-local'
      } else {
        // クラウドBAGEL APIを使用
        if (image1) {
          result = await callBagelEditAPI(prompt, image1)
        } else {
          result = await callBagelTextToImageAPI(prompt)
        }
        usedBackend = 'bagel-cloud'
      }
    } else if (modelId === 'z-image-turbo') {
      // Z-Image-Turbo
      // まずローカルを試行
      const localAvailable = await checkZImageLocalServer()
      if (localAvailable) {
        result = await callZImageLocalAPI(prompt)
        usedBackend = 'zimage-local'
      } else {
        result = await callZImageCloudAPI(prompt)
        usedBackend = 'zimage-cloud'
      }
    } else if (modelId === 'real-esrgan') {
      // Real-ESRGAN 超解像度
      if (!image1) {
        return c.json({ error: true, message: '超解像度には入力画像が必要です' }, 400)
      }
      result = await callUpscaleAPI(image1)
      usedBackend = 'upscale-local'
    } else if (modelId === 'flux2-dev') {
      // FLUX.2 [dev]
      const localAvailable = await checkFlux2LocalServer()
      if (localAvailable) {
        result = await callFlux2LocalAPI(prompt, image1)
        usedBackend = 'flux2-local'
      } else {
        result = await callFlux2CloudAPI(prompt, image1)
        usedBackend = 'flux2-cloud'
      }
    } else if (modelId === 'real-esrgan-ncnn') {
      // Real-ESRGAN ncnn Vulkan (超解像度)
      if (!image1) {
        return c.json({ error: true, message: '超解像度には入力画像が必要です' }, 400)
      }
      result = await callNcnnUpscaleAPI(image1)
      usedBackend = 'ncnn-vulkan'
    } else if (modelId === 'stable-diffusion-onnx-fp16') {
      // Stable Diffusion ONNX FP16 (DirectML)
      result = await callOnnxSDAPI(prompt, negativePrompt, image1)
      usedBackend = 'onnx-sd'
    } else if (modelId === 'flux1-dev-onnx' || modelId === 'flux1-schnell-onnx') {
      // FLUX.1 ONNX版
      const isSchnell = modelId === 'flux1-schnell-onnx'
      result = await callOnnxFluxAPI(prompt, isSchnell)
      usedBackend = isSchnell ? 'onnx-flux-schnell' : 'onnx-flux-dev'
    } else if (modelId === 'bagel-7b-mot-int8') {
      // BAGEL INT8量子化版
      result = await callBagelInt8API(prompt, image1)
      usedBackend = 'bagel-int8'
    } else if (modelId === 'ltx-2-video') {
      // LTX-2 Video Generator
      const videoResult = await callLtx2CloudAPI(prompt, negativePrompt)
      return c.json({
        video: videoResult,
        backend: 'ltx2-cloud',
        modelId,
        type: 'video',
      })
    } else {
      // Qwen系モデルを使用
      // バックエンドを確認
      if (backendStatus.mode === 'unavailable') {
        await initBackend()
      }

      if (backendStatus.mode === 'local') {
        // ローカルPythonサーバーを使用
        result = await callLocalAPI(prompt, negativePrompt, image1, image2)
      } else if (backendStatus.mode === 'cloud') {
        // HuggingFace Spaceを使用
        const modelConfig = getModel(modelId)
        const spaceUrl = modelConfig?.source || HF_SPACE_URL
        console.log('Cloud model config:', { modelId, source: modelConfig?.source, spaceUrl })
        result = await callGradioAPI(spaceUrl, prompt, negativePrompt, image1, image2)
        usedBackend = 'qwen-cloud'
      } else {
        return c.json(
          {
            error: true,
            message: 'バックエンドが利用できません。Pythonサーバーを起動するか、HuggingFace Spaceの状態を確認してください。',
          },
          503
        )
      }
      if (!usedBackend) {
        usedBackend = backendStatus.mode
      }
    }

    return c.json({
      image: result,
      backend: usedBackend || backendStatus.mode,
      modelId,
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
  prompt: string,
  negativePrompt: string,
  image1: File | null,
  image2: File | null
): Promise<string> {
  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('negative_prompt', negativePrompt)
  formData.append('num_inference_steps', '40')
  formData.append('true_cfg_scale', '4.0')
  formData.append('guidance_scale', '1.0')
  formData.append('seed', '-1')

  if (image1) {
    formData.append('image1', image1)
  }
  if (image2) {
    formData.append('image2', image2)
  }

  console.log('Calling local Python server...')

  const res = await fetch(`${PYTHON_SERVER_URL}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'ローカルサーバーでの生成に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// Gradio API呼び出し (HuggingFace Space)
async function callGradioAPI(
  spaceUrl: string,
  prompt: string,
  negativePrompt: string,
  image1: File | null,
  image2: File | null
): Promise<string> {
  console.log('Connecting to HuggingFace Space:', spaceUrl)

  try {
    // @gradio/clientを使用してSpaceに接続
    const client = await Client.connect(spaceUrl)
    
    // 画像をBlobに変換
    const images: Blob[] = []
    if (image1) {
      const buffer = await image1.arrayBuffer()
      images.push(new Blob([buffer], { type: image1.type || 'image/png' }))
    }
    if (image2) {
      const buffer = await image2.arrayBuffer()
      images.push(new Blob([buffer], { type: image2.type || 'image/png' }))
    }

    console.log('Calling predict with params:', {
      hasImages: images.length > 0,
      promptLength: prompt.length,
      negativePromptLength: negativePrompt.length,
    })

    // Gradio Spaceにリクエスト送信
    // パラメータの順序はSpaceのAPIに合わせる
    const result = await client.predict('/predict', {
      image: images.length > 0 ? images[0] : null,
      prompt: prompt,
      negative_prompt: negativePrompt,
      num_inference_steps: 40,
      true_cfg_scale: 4.0,
      guidance_scale: 1.0,
      seed: 0,
    })

    console.log('Prediction result:', result)

    // 結果から画像データを抽出
    if (result?.data && Array.isArray(result.data)) {
      const outputData = result.data[0]
      
      // 文字列（Base64等）の場合
      if (typeof outputData === 'string') {
        // データURLの場合はそのまま返す
        if (outputData.startsWith('data:')) {
          return outputData
        }
        // URLの場合は画像を取得してBase64に変換
        if (outputData.startsWith('http')) {
          const imageRes = await fetch(outputData)
          const imageBuffer = await imageRes.arrayBuffer()
          const base64 = Buffer.from(imageBuffer).toString('base64')
          return `data:image/png;base64,${base64}`
        }
        // Base64の場合はデータURLに変換
        return `data:image/png;base64,${outputData}`
      }
      
      // オブジェクト（URL付き）の場合
      if (outputData?.url) {
        const imageRes = await fetch(outputData.url)
        const imageBuffer = await imageRes.arrayBuffer()
        const base64 = Buffer.from(imageBuffer).toString('base64')
        return `data:image/png;base64,${base64}`
      }
      
      // Blobの場合
      if (outputData instanceof Blob) {
        const arrayBuffer = await outputData.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        return `data:image/png;base64,${base64}`
      }
    }

    throw new Error('画像データの抽出に失敗しました')
  } catch (error) {
    console.error('Gradio API Error:', error)
    throw new Error(`HuggingFace Spaceへの接続に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// BAGEL ローカルAPI呼び出し
async function callBagelLocalAPI(prompt: string, image: File | null): Promise<string> {
  console.log('Calling BAGEL Local API...')

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('mode', image ? 'edit' : 'generate')
  formData.append('num_steps', '30')
  formData.append('cfg_scale', '7.0')
  formData.append('seed', '-1')

  if (image) {
    formData.append('image1', image)
  }

  const res = await fetch(`${BAGEL_LOCAL_URL}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'BAGELローカルサーバーでの生成に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// BAGEL Text-to-Image API呼び出し
async function callBagelTextToImageAPI(prompt: string): Promise<string> {
  console.log('Calling BAGEL Text-to-Image API...')

  const sessionHash = crypto.randomUUID()

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

  const queueData = await queueRes.json()
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
        const data = JSON.parse(line.slice(6))
        // data[0] が画像、data[1] が thinking text
        if (Array.isArray(data) && data[0]) {
          const imageData = data[0]
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
              return imageData
            }
            // URL形式の場合は画像をフェッチしてBase64に変換
            const imageRes = await fetch(imageData)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = Buffer.from(imageBuffer).toString('base64')
            return `data:image/png;base64,${base64}`
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = Buffer.from(imageBuffer).toString('base64')
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
  const base64 = Buffer.from(buffer).toString('base64')
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

  const queueData = await queueRes.json()
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
        const data = JSON.parse(line.slice(6))
        if (Array.isArray(data) && data[0]) {
          const imageData = data[0]
          if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
              return imageData
            }
            const imageRes = await fetch(imageData)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = Buffer.from(imageBuffer).toString('base64')
            return `data:image/png;base64,${base64}`
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = Buffer.from(imageBuffer).toString('base64')
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

// Z-Image ローカルサーバーチェック
async function checkZImageLocalServer(): Promise<boolean> {
  try {
    const res = await fetch(`${ZIMAGE_LOCAL_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      return data.status === 'ok'
    }
  } catch {
    // ローカルサーバーが利用不可
  }
  return false
}

// Z-Image ローカルAPI呼び出し
async function callZImageLocalAPI(prompt: string): Promise<string> {
  console.log('Calling Z-Image Local API...')

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('width', '1024')
  formData.append('height', '1024')
  formData.append('num_inference_steps', '9')
  formData.append('seed', '-1')

  const res = await fetch(`${ZIMAGE_LOCAL_URL}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'Z-Imageローカルサーバーでの生成に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// Z-Image Cloud API呼び出し
async function callZImageCloudAPI(prompt: string): Promise<string> {
  console.log('Calling Z-Image Cloud API...')

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

  const queueData = await queueRes.json()
  const eventId = queueData.event_id

  // イベントストリームから結果を取得
  const streamRes = await fetch(`${ZIMAGE_SPACE_URL}/gradio_api/call/generate/${eventId}`)

  if (!streamRes.ok) {
    throw new Error('Z-Image結果の取得に失敗しました')
  }

  const text = await streamRes.text()
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6))
        // 応答形式: [GalleryData, seedText, seedNumber]
        // GalleryData = [{image: {path, url, ...}, caption}, ...]
        if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
          const galleryData = data[0]
          if (galleryData.length > 0) {
            const firstImage = galleryData[0]
            const imageInfo = firstImage?.image
            if (imageInfo?.url) {
              // URLから画像を取得
              const imageRes = await fetch(imageInfo.url)
              const imageBuffer = await imageRes.arrayBuffer()
              const base64 = Buffer.from(imageBuffer).toString('base64')
              return `data:image/png;base64,${base64}`
            } else if (imageInfo?.path) {
              // pathがURLの場合
              if (imageInfo.path.startsWith('http')) {
                const imageRes = await fetch(imageInfo.path)
                const imageBuffer = await imageRes.arrayBuffer()
                const base64 = Buffer.from(imageBuffer).toString('base64')
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
              const base64 = Buffer.from(imageBuffer).toString('base64')
              return `data:image/png;base64,${base64}`
            }
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = Buffer.from(imageBuffer).toString('base64')
            return `data:image/png;base64,${base64}`
          }
        }
      } catch (e) {
        console.error('Z-Image parse error:', e)
        // パースエラーは無視して次の行へ
      }
    }
  }

  console.error('Z-Image response text:', text)
  throw new Error('Z-Image画像の生成に失敗しました')
}

// Upscale API呼び出し
async function callUpscaleAPI(image: File): Promise<string> {
  console.log('Calling Upscale API...')

  const formData = new FormData()
  formData.append('image', image)
  formData.append('scale', '4')

  const res = await fetch(`${UPSCALE_LOCAL_URL}/upscale`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || '超解像度処理に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// FLUX.2 ローカルサーバーチェック
async function checkFlux2LocalServer(): Promise<boolean> {
  try {
    const res = await fetch(`${FLUX2_LOCAL_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      return data.status === 'ok'
    }
  } catch {
    // ローカルサーバーが利用不可
  }
  return false
}

// FLUX.2 ローカルAPI呼び出し
async function callFlux2LocalAPI(prompt: string, image: File | null): Promise<string> {
  console.log('Calling FLUX.2 Local API...')

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('width', '1024')
  formData.append('height', '1024')
  formData.append('num_inference_steps', '30')
  formData.append('guidance_scale', '4.0')
  formData.append('seed', '-1')

  if (image) {
    formData.append('image1', image)
  }

  const res = await fetch(`${FLUX2_LOCAL_URL}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'FLUX.2ローカルサーバーでの生成に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// FLUX.2 Cloud API呼び出し
async function callFlux2CloudAPI(prompt: string, image: File | null): Promise<string> {
  console.log('Calling FLUX.2 Cloud API...')

  // 画像をBase64に変換（入力画像がある場合）
  const inputImages: Array<{ url: string }> = []
  if (image) {
    const buffer = await image.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
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

  const queueData = await queueRes.json()
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
            const base64 = Buffer.from(imageBuffer).toString('base64')
            return `data:image/png;base64,${base64}`
          } else if (imageData?.url) {
            const imageRes = await fetch(imageData.url)
            const imageBuffer = await imageRes.arrayBuffer()
            const base64 = Buffer.from(imageBuffer).toString('base64')
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

// ncnn Vulkan Upscale API呼び出し
async function callNcnnUpscaleAPI(image: File): Promise<string> {
  console.log('Calling ncnn Vulkan Upscale API...')

  const formData = new FormData()
  formData.append('image', image)
  formData.append('scale', '4')
  formData.append('model', 'realesrgan-x4plus')

  const res = await fetch(`${NCNN_LOCAL_URL}/upscale`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'ncnn超解像度処理に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// ONNX Stable Diffusion API呼び出し
async function callOnnxSDAPI(prompt: string, negativePrompt: string, image: File | null): Promise<string> {
  console.log('Calling ONNX Stable Diffusion API...')

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('negative_prompt', negativePrompt)
  formData.append('num_inference_steps', '30')
  formData.append('guidance_scale', '7.5')
  formData.append('seed', '-1')

  if (image) {
    formData.append('image', image)
    formData.append('strength', '0.75')
  }

  const res = await fetch(`${ONNX_SD_LOCAL_URL}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'ONNX Stable Diffusionでの生成に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// ONNX FLUX API呼び出し
async function callOnnxFluxAPI(prompt: string, isSchnell: boolean): Promise<string> {
  console.log(`Calling ONNX FLUX ${isSchnell ? 'Schnell' : 'Dev'} API...`)

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('model', isSchnell ? 'schnell' : 'dev')
  formData.append('num_inference_steps', isSchnell ? '4' : '30')
  formData.append('guidance_scale', isSchnell ? '0' : '3.5')
  formData.append('width', '1024')
  formData.append('height', '1024')
  formData.append('seed', '-1')

  const res = await fetch(`${ONNX_FLUX_LOCAL_URL}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'ONNX FLUXでの生成に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// BAGEL INT8 API呼び出し
async function callBagelInt8API(prompt: string, image: File | null): Promise<string> {
  console.log('Calling BAGEL INT8 API...')

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('mode', image ? 'edit' : 'generate')
  formData.append('num_steps', '30')
  formData.append('cfg_scale', '7.0')
  formData.append('seed', '-1')

  if (image) {
    formData.append('image1', image)
  }

  const res = await fetch(`${BAGEL_INT8_LOCAL_URL}/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'BAGEL INT8での生成に失敗しました')
  }

  const data = await res.json()
  return data.image
}

// LTX-2 Video Generator API呼び出し
async function callLtx2CloudAPI(prompt: string, negativePrompt: string): Promise<string> {
  console.log('Calling LTX-2 Video Generator API...')

  // Gradio API呼び出し
  const queueRes = await fetch(`${LTX2_SPACE_URL}/gradio_api/call/generate_video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: [
        prompt,           // prompt
        negativePrompt || 'worst quality, inconsistent motion, blurry, jittery, distorted', // negative_prompt
        512,              // width
        320,              // height
        49,               // num_frames (2秒 @24fps)
        30,               // num_inference_steps
        4.0,              // guidance_scale
        -1,               // seed (-1 = random)
      ],
    }),
  })

  if (!queueRes.ok) {
    const errorText = await queueRes.text()
    console.error('LTX-2 queue error:', errorText)
    throw new Error('LTX-2 APIへの接続に失敗しました')
  }

  const queueData = await queueRes.json()
  const eventId = queueData.event_id

  // イベントストリームから結果を取得
  const streamRes = await fetch(`${LTX2_SPACE_URL}/gradio_api/call/generate_video/${eventId}`)

  if (!streamRes.ok) {
    throw new Error('LTX-2結果の取得に失敗しました')
  }

  const text = await streamRes.text()
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6))
        // data[0] がビデオ、data[1] がステータス
        if (Array.isArray(data) && data[0]) {
          const videoData = data[0]
          if (typeof videoData === 'object' && videoData.url) {
            // Gradio file response format
            return videoData.url
          }
          if (typeof videoData === 'string') {
            if (videoData.startsWith('data:')) {
              return videoData
            }
            // URL形式の場合はそのまま返す
            return videoData
          }
        }
      } catch (e) {
        // パース失敗、次の行を試す
      }
    }
  }

  throw new Error('LTX-2からビデオを取得できませんでした')
}

// ============================
// 認証API
// ============================

// ログイン
app.post('/api/auth/login', loginHandler)

// ログアウト
app.post('/api/auth/logout', logoutHandler)

// セッション確認
app.get('/api/auth/check', checkSessionHandler)

// ============================
// 管理者API（認証必須）
// ============================

// モデル一覧取得
app.get('/api/admin/models', authMiddleware, (c) => {
  try {
    const models = getAllModels()
    return c.json({ models })
  } catch (error) {
    return c.json({ error: true, message: 'モデル一覧の取得に失敗しました' }, 500)
  }
})

// モデル詳細取得
app.get('/api/admin/models/:id', authMiddleware, (c) => {
  try {
    const id = c.req.param('id')
    const model = getModel(id)
    if (!model) {
      return c.json({ error: true, message: 'モデルが見つかりません' }, 404)
    }
    return c.json({ model })
  } catch (error) {
    return c.json({ error: true, message: 'モデルの取得に失敗しました' }, 500)
  }
})

// モデル追加
app.post('/api/admin/models', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { name, type, source, description, backends, isDefault, enabled } = body

    if (!name || !type || !source) {
      return c.json({ error: true, message: '必須項目が不足しています' }, 400)
    }

    const newModel = addModel({
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

// モデル更新
app.put('/api/admin/models/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    const updatedModel = updateModel(id, body)
    return c.json({ model: updatedModel })
  } catch (error) {
    return c.json(
      { error: true, message: error instanceof Error ? error.message : 'モデルの更新に失敗しました' },
      400
    )
  }
})

// モデル削除
app.delete('/api/admin/models/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    deleteModel(id)
    return c.json({ success: true, message: 'モデルを削除しました' })
  } catch (error) {
    return c.json(
      { error: true, message: error instanceof Error ? error.message : 'モデルの削除に失敗しました' },
      400
    )
  }
})

// 設定取得
app.get('/api/admin/settings', authMiddleware, (c) => {
  try {
    const settings = getSettings()
    return c.json({ settings })
  } catch (error) {
    return c.json({ error: true, message: '設定の取得に失敗しました' }, 500)
  }
})

// 設定更新
app.put('/api/admin/settings', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const updatedSettings = updateSettings(body)
    return c.json({ settings: updatedSettings })
  } catch (error) {
    return c.json(
      { error: true, message: error instanceof Error ? error.message : '設定の更新に失敗しました' },
      400
    )
  }
})

// サーバー起動
const port = 3001
console.log(`Server running at http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
