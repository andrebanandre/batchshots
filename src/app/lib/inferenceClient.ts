/**
 * Typed main-thread client for the shared inference worker
 * (public/workers/inference.worker.js).
 *
 * One worker instance per page lifetime; requests are correlated by
 * requestId and resolved as promises. All DNN steps go through this.
 */

export type InferenceTask =
  | 'embed'
  | 'segment'
  | 'detect'
  | 'classify'
  | 'quality'
  | 'ocr'
  | 'colorize'
  | 'inpaint';

export interface EmbedResult {
  embedding: Float32Array;
  dim: number;
}

export interface SegmentResult {
  mask: Float32Array;
  maskWidth: number;
  maskHeight: number;
}

export interface DetectBox {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  classId: number;
}

export interface DetectResult {
  boxes: DetectBox[];
}

export interface ClassifyResult {
  topK: { classId: number; score: number }[];
}

export interface QualityResult {
  blurVariance: number;
  brightnessMean: number;
  clippedShadowsPct: number;
  clippedHighlightsPct: number;
  width: number;
  height: number;
}

export interface OcrResult {
  texts: string[];
  joined: string;
}

export interface ColorizeResult {
  /** Full-size RGBA pixel buffer, same dimensions as the source bitmap. */
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface InpaintResult {
  /** Full-size RGBA pixel buffer, same dimensions as the source bitmap. */
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface ModelLoadProgress {
  model: string;
  loadedBytes: number;
  totalBytes: number | null;
}

type Pending = {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
};

let worker: Worker | null = null;
let cvReady: Promise<void> | null = null;
let requestSeq = 0;
const pending = new Map<string, Pending>();
const progressListeners = new Set<(p: ModelLoadProgress) => void>();

export function onModelLoadProgress(
  listener: (p: ModelLoadProgress) => void
): () => void {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker('/workers/inference.worker.js');
    worker.onmessage = (event: MessageEvent) => {
      const { status, requestId, data, model, loadedBytes, totalBytes } =
        event.data;
      if (status === 'model-loading') {
        for (const l of progressListeners) l({ model, loadedBytes, totalBytes });
        return;
      }
      if (status === 'result' || status === 'task-error') {
        const p = requestId ? pending.get(requestId) : undefined;
        if (p) {
          pending.delete(requestId);
          if (status === 'result') p.resolve(data);
          else p.reject(new Error(String(data)));
        }
      }
    };
    worker.onerror = (e) => {
      // Fatal worker error: reject everything in flight
      for (const p of pending.values()) {
        p.reject(new Error(`Inference worker error: ${e.message}`));
      }
      pending.clear();
    };
  }
  return worker;
}

/** Initialize the worker + OpenCV runtime. Idempotent. */
export function initInference(): Promise<void> {
  if (!cvReady) {
    cvReady = new Promise((resolve, reject) => {
      const w = getWorker();
      const onMessage = (event: MessageEvent) => {
        if (event.data.status === 'cv-ready') {
          w.removeEventListener('message', onMessage);
          resolve();
        } else if (event.data.status === 'error') {
          w.removeEventListener('message', onMessage);
          cvReady = null;
          reject(new Error(String(event.data.data)));
        }
      };
      w.addEventListener('message', onMessage);
      w.postMessage({ type: 'init' });
    });
  }
  return cvReady;
}

export interface RunOptions {
  /** Model file override (e.g. 'u2net.onnx' for HQ segmentation) */
  model?: string;
  [key: string]: unknown;
}

async function run<R>(
  task: InferenceTask,
  imageId: string,
  bitmap: ImageBitmap,
  options: RunOptions = {}
): Promise<R> {
  await initInference();
  const w = getWorker();
  const requestId = `${task}-${imageId}-${++requestSeq}`;
  return new Promise<R>((resolve, reject) => {
    pending.set(requestId, {
      resolve: resolve as (data: unknown) => void,
      reject,
    });
    w.postMessage({ type: 'run', task, imageId, requestId, bitmap, options }, [
      bitmap,
    ]);
  });
}

/** Create an ImageBitmap from a blob URL, optionally capped to maxSide px. */
export async function bitmapFromUrl(
  url: string,
  maxSide?: number
): Promise<ImageBitmap> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  if (maxSide) {
    const probe = await createImageBitmap(blob);
    const { width, height } = probe;
    if (Math.max(width, height) > maxSide) {
      const scale = maxSide / Math.max(width, height);
      const scaled = await createImageBitmap(probe, {
        resizeWidth: Math.round(width * scale),
        resizeHeight: Math.round(height * scale),
      });
      probe.close();
      return scaled;
    }
    return probe;
  }
  return createImageBitmap(blob);
}

export const inference = {
  embed: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<EmbedResult>('embed', id, bmp, opts),
  segment: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<SegmentResult>('segment', id, bmp, opts),
  detect: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<DetectResult>('detect', id, bmp, opts),
  classify: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<ClassifyResult>('classify', id, bmp, opts),
  quality: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<QualityResult>('quality', id, bmp, opts),
  ocr: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<OcrResult>('ocr', id, bmp, opts),
  colorize: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<ColorizeResult>('colorize', id, bmp, opts),
  inpaint: (id: string, bmp: ImageBitmap, opts?: RunOptions) =>
    run<InpaintResult>('inpaint', id, bmp, opts),
};

/** Free a model's memory in the worker (e.g. after a step completes). */
export function unloadModel(model: string): void {
  worker?.postMessage({ type: 'unloadModel', model });
}

/** Tear down the worker entirely (page unmount). */
export function disposeInference(): void {
  worker?.terminate();
  worker = null;
  cvReady = null;
  for (const p of pending.values()) {
    p.reject(new Error('Inference worker disposed'));
  }
  pending.clear();
}
