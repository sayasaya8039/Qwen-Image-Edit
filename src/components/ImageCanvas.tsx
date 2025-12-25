import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import type { ImageFile, GenerationStatus } from '../types'

interface ImageCanvasProps {
  images: ImageFile[]
  outputImage: string | null
  onAddImage: (files: File[]) => void
  onRemoveImage: (id: string) => void
  onToggleImage: (id: string) => void
  onClearImages: () => void
  status: GenerationStatus
}

export function ImageCanvas({
  images,
  outputImage,
  onAddImage,
  onRemoveImage,
  onToggleImage,
  onClearImages,
  status,
}: ImageCanvasProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const imageFiles = acceptedFiles.filter((file) => file.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        onAddImage(imageFiles)
      }
    },
    [onAddImage]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 4,
    disabled: images.length >= 4 || status.isProcessing,
  })

  // 有効な画像数
  const enabledCount = images.filter(img => img.enabled).length

  return (
    <main className="flex-1 bg-[#252525] overflow-auto p-4">
      <div className="h-full flex flex-col gap-4">
        {/* 入力画像エリア */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-[var(--ps-text-muted)] uppercase">
              入力画像 ({images.length}/4)
              {enabledCount < images.length && (
                <span className="ml-2 text-yellow-400">
                  ({enabledCount}枚有効)
                </span>
              )}
            </h3>
            {images.length > 0 && (
              <button
                className="text-xs text-[var(--ps-text-muted)] hover:text-white transition-colors"
                onClick={onClearImages}
              >
                すべてクリア
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 h-[calc(100%-24px)]">
            {/* 4つの画像スロット */}
            {[0, 1, 2, 3].map((index) => (
              <ImageSlot
                key={index}
                image={images[index]}
                index={index}
                onRemove={onRemoveImage}
                onToggle={onToggleImage}
                getRootProps={images.length === index ? getRootProps : undefined}
                getInputProps={images.length === index ? getInputProps : undefined}
                isDragActive={isDragActive && images.length === index}
                isDisabled={status.isProcessing}
              />
            ))}
          </div>
        </div>

        {/* 矢印 */}
        <div className="flex justify-center">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--ps-bg-medium)] border border-[var(--ps-border)]">
            <svg className="w-5 h-5 text-[var(--ps-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* 出力画像エリア */}
        <div className="flex-1 min-h-0">
          <h3 className="text-xs font-medium text-[var(--ps-text-muted)] uppercase mb-2">
            出力画像
          </h3>
          <div className="h-[calc(100%-24px)] panel rounded-lg overflow-hidden relative">
            {status.isProcessing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="spinner" />
                <div className="text-sm text-[var(--ps-text-muted)]">{status.message}</div>
                <div className="w-48">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : outputImage ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={outputImage}
                  alt="Generated"
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--ps-text-muted)]">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm">生成された画像がここに表示されます</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

interface ImageSlotProps {
  image?: ImageFile
  index: number
  onRemove: (id: string) => void
  onToggle: (id: string) => void
  getRootProps?: ReturnType<typeof useDropzone>['getRootProps']
  getInputProps?: ReturnType<typeof useDropzone>['getInputProps']
  isDragActive?: boolean
  isDisabled?: boolean
}

function ImageSlot({
  image,
  index,
  onRemove,
  onToggle,
  getRootProps,
  getInputProps,
  isDragActive,
  isDisabled,
}: ImageSlotProps) {
  if (image) {
    return (
      <div className={`panel rounded-lg overflow-hidden relative group ${!image.enabled ? 'opacity-40' : ''}`}>
        <img
          src={image.preview}
          alt={`Input ${index + 1}`}
          className="w-full h-full object-contain"
        />
        {/* 削除ボタン */}
        <button
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(image.id)}
          title="削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* オン/オフスイッチ */}
        <button
          className={`absolute top-2 left-2 w-10 h-5 rounded-full transition-colors ${
            image.enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
          onClick={() => onToggle(image.id)}
          title={image.enabled ? '無効にする' : '有効にする'}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
              image.enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs flex items-center gap-2">
          <span>画像 {index + 1}</span>
          {!image.enabled && <span className="text-yellow-400">(無効)</span>}
        </div>
      </div>
    )
  }

  if (getRootProps && getInputProps) {
    return (
      <div
        {...getRootProps()}
        className={`dropzone rounded-lg flex flex-col items-center justify-center cursor-pointer ${
          isDragActive ? 'active' : ''
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <svg
          className="w-8 h-8 mb-2 text-[var(--ps-text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <p className="text-xs text-[var(--ps-text-muted)] text-center">
          {isDragActive ? 'ドロップ' : 'クリック'}
        </p>
        <p className="text-xs text-[var(--ps-text-muted)] mt-1">
          画像 {index + 1}
        </p>
      </div>
    )
  }

  return (
    <div className="panel rounded-lg flex flex-col items-center justify-center opacity-40">
      <svg
        className="w-8 h-8 mb-2 text-[var(--ps-text-muted)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p className="text-xs text-[var(--ps-text-muted)]">画像 {index + 1}</p>
    </div>
  )
}
