/**
 * Shared canvas image operations used by step engines:
 * mask compositing (bg removal), crop/pad/square (auto-crop),
 * resize + encode (resize/export). All blob-URL based.
 */

export async function blobFromUrl(url: string): Promise<Blob> {
  const resp = await fetch(url);
  return resp.blob();
}

export function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type = 'image/png',
  quality?: number
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      type,
      quality
    );
  });
}

/**
 * Apply a low-res alpha mask (0..1) to a full-size image.
 * Returns a transparent PNG blob, or a composite on `background` color.
 */
export async function applyMask(
  imageUrl: string,
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
  background: string | null = null
): Promise<Blob> {
  const bitmap = await createImageBitmap(await blobFromUrl(imageUrl));
  try {
    const { width, height } = bitmap;

    // Upscale mask to image size using canvas smoothing:
    // write mask into a small alpha-only canvas, draw scaled.
    const maskCanvas = new OffscreenCanvas(maskWidth, maskHeight);
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskImage = maskCtx.createImageData(maskWidth, maskHeight);
    for (let i = 0; i < mask.length; i++) {
      maskImage.data[i * 4 + 3] = Math.round(mask[i] * 255);
    }
    maskCtx.putImageData(maskImage, 0, 0);

    const out = new OffscreenCanvas(width, height);
    const ctx = out.getContext('2d')!;
    // Draw the scaled mask alpha, then keep only image pixels inside it
    ctx.drawImage(maskCanvas, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(bitmap, 0, 0);

    if (background) {
      const withBg = new OffscreenCanvas(width, height);
      const bgCtx = withBg.getContext('2d')!;
      bgCtx.fillStyle = background;
      bgCtx.fillRect(0, 0, width, height);
      bgCtx.drawImage(out, 0, 0);
      return canvasToBlob(withBg, 'image/jpeg', 0.92);
    }
    return canvasToBlob(out, 'image/png');
  } finally {
    bitmap.close();
  }
}

export interface CropOptions {
  /** Margin around the box as a fraction of the box size (e.g. 0.1) */
  marginPct?: number;
  /** Pad to a square canvas */
  square?: boolean;
  /** Canvas fill — null keeps transparency (PNG output) */
  background?: string | null;
  /** Optional fixed output size (square side or longest side) */
  outputSize?: number;
}

/** Crop a region (image coords), optionally pad to square / fixed size. */
export async function cropAndPad(
  imageUrl: string,
  box: { x: number; y: number; w: number; h: number },
  options: CropOptions = {}
): Promise<Blob> {
  const { marginPct = 0.05, square = true, background = '#ffffff', outputSize } = options;
  const bitmap = await createImageBitmap(await blobFromUrl(imageUrl));
  try {
    const mx = box.w * marginPct;
    const my = box.h * marginPct;
    const x = Math.max(0, box.x - mx);
    const y = Math.max(0, box.y - my);
    const w = Math.min(bitmap.width - x, box.w + 2 * mx);
    const h = Math.min(bitmap.height - y, box.h + 2 * my);

    const side = Math.max(w, h);
    const outW = square ? side : w;
    const outH = square ? side : h;
    const scale = outputSize ? outputSize / Math.max(outW, outH) : 1;

    const canvas = new OffscreenCanvas(
      Math.round(outW * scale),
      Math.round(outH * scale)
    );
    const ctx = canvas.getContext('2d')!;
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Center the crop in the (possibly square) canvas
    const dx = ((outW - w) / 2) * scale;
    const dy = ((outH - h) / 2) * scale;
    ctx.drawImage(bitmap, x, y, w, h, dx, dy, w * scale, h * scale);
    return canvasToBlob(
      canvas,
      background ? 'image/jpeg' : 'image/png',
      background ? 0.92 : undefined
    );
  } finally {
    bitmap.close();
  }
}

export interface ResizeEncodeOptions {
  /** Target box (image is fit inside, aspect preserved) */
  width: number;
  height: number | null;
  format: 'jpeg' | 'png' | 'webp';
  quality?: number; // 0..1 for jpeg/webp
  /** Pad to exactly width×height with this color instead of fitting */
  padToExact?: boolean;
  background?: string;
  /** Mild unsharp-style sharpen after resize */
  sharpen?: boolean;
}

/** Resize to preset dimensions and encode. */
export async function resizeAndEncode(
  imageUrl: string,
  options: ResizeEncodeOptions
): Promise<Blob> {
  const {
    width,
    height,
    format,
    quality = 0.9,
    padToExact = false,
    background = '#ffffff',
    sharpen = false,
  } = options;
  const bitmap = await createImageBitmap(await blobFromUrl(imageUrl));
  try {
    const targetH = height ?? Math.round((bitmap.height / bitmap.width) * width);
    const scale = Math.min(width / bitmap.width, targetH / bitmap.height, 1);
    const drawW = Math.round(bitmap.width * scale);
    const drawH = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(
      padToExact ? width : drawW,
      padToExact ? targetH : drawH
    );
    const ctx = canvas.getContext('2d')!;
    if (format === 'jpeg' || padToExact) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      bitmap,
      (canvas.width - drawW) / 2,
      (canvas.height - drawH) / 2,
      drawW,
      drawH
    );

    if (sharpen) applySharpenToCanvas(canvas, ctx);

    return canvasToBlob(canvas, `image/${format}`, quality);
  } finally {
    bitmap.close();
  }
}

/** Simple 3×3 unsharp kernel, in place. Mild (marketplace-safe). */
function applySharpenToCanvas(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D
): void {
  const { width, height } = canvas;
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const s = 0.25; // strength
  const kernel = [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0];
  const d = src.data;
  const o = out.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        o[idx] = d[idx];
        o[idx + 1] = d[idx + 1];
        o[idx + 2] = d[idx + 2];
        o[idx + 3] = d[idx + 3];
        continue;
      }
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += d[((y + ky) * width + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        o[idx + c] = Math.max(0, Math.min(255, sum));
      }
      o[idx + 3] = d[idx + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

/** Encode targeting a max file size via quality binary search (jpeg/webp). */
export async function encodeToTargetSize(
  imageUrl: string,
  options: Omit<ResizeEncodeOptions, 'quality'>,
  maxBytes: number
): Promise<Blob> {
  let lo = 0.4;
  let hi = 0.95;
  let best: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    const q = (lo + hi) / 2;
    const blob = await resizeAndEncode(imageUrl, { ...options, quality: q });
    if (blob.size <= maxBytes) {
      best = blob;
      lo = q;
    } else {
      hi = q;
    }
  }
  return best ?? resizeAndEncode(imageUrl, { ...options, quality: lo });
}
