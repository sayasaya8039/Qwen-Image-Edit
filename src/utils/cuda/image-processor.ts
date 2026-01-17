export interface CudaProcessingOptions {
  enabled: boolean;
  wgsl: string;
  stage: 'preprocessing' | 'postprocessing' | 'both';
}

export interface ProcessingPipeline {
  preprocessing?: string;
  postprocessing?: string;
}

import { webgpuExecutor } from './webgpu-executor';

export class ImageProcessor {
  private static instance: ImageProcessor | null = null;

  private constructor() {}

  static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }

  async applyPreprocessing(
    imageData: ImageData,
    wgsl: string
  ): Promise<ImageData> {
    if (!wgsl || wgsl.trim() === '') {
      return imageData;
    }

    try {
      return await webgpuExecutor.processImage(imageData, wgsl);
    } catch (error) {
      console.error('Preprocessing failed:', error);
      throw new Error(`CUDA前処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async applyPostprocessing(
    imageData: ImageData,
    wgsl: string
  ): Promise<ImageData> {
    if (!wgsl || wgsl.trim() === '') {
      return imageData;
    }

    try {
      return await webgpuExecutor.processImage(imageData, wgsl);
    } catch (error) {
      console.error('Postprocessing failed:', error);
      throw new Error(`CUDA後処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async processPipeline(
    inputImage: ImageData,
    pipeline: ProcessingPipeline,
    aiProcessFn: (preprocessed: ImageData) => Promise<ImageData>
  ): Promise<ImageData> {
    let currentImage = inputImage;

    if (pipeline.preprocessing) {
      console.log('Applying CUDA preprocessing...');
      currentImage = await this.applyPreprocessing(
        currentImage,
        pipeline.preprocessing
      );
    }

    console.log('Running AI processing...');
    currentImage = await aiProcessFn(currentImage);

    if (pipeline.postprocessing) {
      console.log('Applying CUDA postprocessing...');
      currentImage = await this.applyPostprocessing(
        currentImage,
        pipeline.postprocessing
      );
    }

    return currentImage;
  }

  async fileToImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        URL.revokeObjectURL(url);
        resolve(imageData);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  async imageDataToBlob(
    imageData: ImageData,
    type: string = 'image/png',
    quality: number = 0.95
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        type,
        quality
      );
    });
  }

  async imageDataToDataUrl(
    imageData: ImageData,
    type: string = 'image/png',
    quality: number = 0.95
  ): Promise<string> {
    const blob = await this.imageDataToBlob(imageData, type, quality);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read blob as data URL'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async base64ToImageData(base64: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };

      img.onerror = () => reject(new Error('Failed to load base64 image'));
      img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });
  }
}

export const imageProcessor = ImageProcessor.getInstance();
