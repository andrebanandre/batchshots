/**
 * 64-bit DCT perceptual hash (pHash).
 *
 * Pure-logic implementation: no canvas/DOM dependency. Callers are
 * responsible for extracting RGBA pixel data (e.g. via an offscreen
 * canvas) and passing it in as a Uint8ClampedArray.
 */

const HASH_SIZE = 32; // resize target (32x32)
const LOW_FREQ = 8; // top-left 8x8 DCT block

/** Convert RGBA pixel data to a single-channel luma buffer. */
export function lumaFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  const luma = new Float32Array(width * height);
  for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return luma;
}

/** Bilinear resize a single-channel buffer to targetW x targetH. */
function bilinearResize(
  src: Float32Array,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number
): Float32Array {
  const dst = new Float32Array(targetW * targetH);
  if (srcW === 1 && srcH === 1) {
    dst.fill(src[0]);
    return dst;
  }
  const xRatio = srcW > 1 ? (srcW - 1) / (targetW - 1 || 1) : 0;
  const yRatio = srcH > 1 ? (srcH - 1) / (targetH - 1 || 1) : 0;

  for (let y = 0; y < targetH; y++) {
    const srcY = targetH > 1 ? y * yRatio : 0;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const yFrac = srcY - y0;

    for (let x = 0; x < targetW; x++) {
      const srcX = targetW > 1 ? x * xRatio : 0;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const xFrac = srcX - x0;

      const top = src[y0 * srcW + x0] * (1 - xFrac) + src[y0 * srcW + x1] * xFrac;
      const bottom = src[y1 * srcW + x0] * (1 - xFrac) + src[y1 * srcW + x1] * xFrac;
      dst[y * targetW + x] = top * (1 - yFrac) + bottom * yFrac;
    }
  }
  return dst;
}

/** 2D DCT-II applied to an NxN buffer (naive O(n^4), fine for N=32). */
function dct2d(block: Float32Array, n: number): Float32Array {
  const out = new Float32Array(n * n);
  const cos = new Float64Array(n * n);
  for (let x = 0; x < n; x++) {
    for (let u = 0; u < n; u++) {
      cos[x * n + u] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n));
    }
  }

  // Row-wise DCT then column-wise DCT (separable).
  const temp = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let u = 0; u < n; u++) {
      let sum = 0;
      for (let x = 0; x < n; x++) {
        sum += block[y * n + x] * cos[x * n + u];
      }
      temp[y * n + u] = sum;
    }
  }
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      let sum = 0;
      for (let y = 0; y < n; y++) {
        sum += temp[y * n + u] * cos[y * n + v];
      }
      out[v * n + u] = sum;
    }
  }
  return out;
}

/**
 * Compute a 64-bit perceptual hash from a luma buffer.
 * Resizes to 32x32, runs a 2D DCT, takes the top-left 8x8 low-frequency
 * block (excluding the DC term at [0][0]), thresholds against the median
 * of those 63 coefficients, and packs the bits into a 16-char hex string.
 */
export function phashFromLuma(luma: Float32Array, width: number, height: number): string {
  const resized = bilinearResize(luma, width, height, HASH_SIZE, HASH_SIZE);
  const dct = dct2d(resized, HASH_SIZE);

  const coeffs: number[] = [];
  for (let v = 0; v < LOW_FREQ; v++) {
    for (let u = 0; u < LOW_FREQ; u++) {
      if (u === 0 && v === 0) continue; // skip DC term
      coeffs.push(dct[v * HASH_SIZE + u]);
    }
  }

  const sorted = [...coeffs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const bits: number[] = [];
  bits.push(0); // placeholder bit for the DC term, always 0
  for (const c of coeffs) {
    bits.push(c > median ? 1 : 0);
  }

  // Pack 64 bits into 16 hex chars (4 bits per char).
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

/** Hamming distance between two equal-length hex strings. */
export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) {
    throw new Error('hammingDistanceHex: hash length mismatch');
  }
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      distance += x & 1;
      x >>= 1;
    }
  }
  return distance;
}
