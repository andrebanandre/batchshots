/**
 * Model byte cache: Cache API backed fetch of ONNX models from the public R2 domain.
 *
 * Works on the main thread and inside workers (both have fetch + caches).
 * Bump CACHE_NAME when model files change so stale bytes are dropped.
 */

const CACHE_NAME = 'bs-models-v1';

export type ModelName =
  | 'u2netp.onnx'
  | 'u2net.onnx'
  | 'yolov8n.onnx'
  | 'dinov2-small.onnx'
  | 'ppocr-det.onnx'
  | 'ppocr-rec.onnx'
  | 'mobilenetv2.onnx';

export interface ModelFetchProgress {
  loadedBytes: number;
  totalBytes: number | null;
}

/**
 * Fetch model bytes, serving from the Cache API when available.
 * `baseUrl` allows overriding the public model origin.
 */
export async function getModel(
  name: string,
  onProgress?: (progress: ModelFetchProgress) => void,
  baseUrl = 'https://s3.batchshots.com/models/'
): Promise<Uint8Array> {
  const url = `${baseUrl}${name}`;

  // 1. Try Cache API
  let cache: Cache | null = null;
  if (typeof caches !== 'undefined') {
    try {
      cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) {
        const buf = await hit.arrayBuffer();
        onProgress?.({ loadedBytes: buf.byteLength, totalBytes: buf.byteLength });
        return new Uint8Array(buf);
      }
    } catch {
      cache = null; // Cache API unavailable (e.g. some private modes)
    }
  }

  // 2. Streamed network fetch with progress
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch model ${name}: HTTP ${resp.status}`);
  }

  const totalBytes = Number(resp.headers.get('content-length')) || null;
  let bytes: Uint8Array;

  if (resp.body && onProgress) {
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loadedBytes += value.byteLength;
      onProgress({ loadedBytes, totalBytes });
    }
    bytes = new Uint8Array(loadedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    const buf = await resp.arrayBuffer();
    bytes = new Uint8Array(buf);
    onProgress?.({ loadedBytes: bytes.byteLength, totalBytes: bytes.byteLength });
  }

  // 3. Store in cache for next time (best-effort)
  if (cache) {
    try {
      await cache.put(url, new Response(bytes.slice().buffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
      }));
    } catch {
      /* quota exceeded or similar — serve from network next time */
    }
  }

  return bytes;
}

/** Drop all cached model bytes (used by the model-check page / debugging). */
export async function clearModelCache(): Promise<void> {
  if (typeof caches !== 'undefined') {
    await caches.delete(CACHE_NAME);
  }
}
