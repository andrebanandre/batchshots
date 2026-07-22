/**
 * Dominant color extraction + nearest color-name lookup.
 * Pure logic: operates on raw RGBA pixel arrays, no canvas/DOM.
 */

type RGB = [number, number, number];

const MAX_ITERATIONS = 10;
const K = 3;

function luma([r, g, b]: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function distSq(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Extract the dominant color from RGBA pixel data using a small,
 * deterministic k-means (k=3). Pixels with alpha < 128 are ignored.
 * Centroids are seeded from the darkest/mid/brightest pixels by luma
 * so results are stable across runs.
 */
export function dominantColorFromPixels(data: Uint8ClampedArray): RGB {
  const pixels: RGB[] = [];
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 128) continue;
    pixels.push([data[p], data[p + 1], data[p + 2]]);
  }

  if (pixels.length === 0) return [0, 0, 0];
  if (pixels.length === 1) return pixels[0];

  const sortedByLuma = [...pixels].sort((a, b) => luma(a) - luma(b));
  const darkest = sortedByLuma[0];
  const brightest = sortedByLuma[sortedByLuma.length - 1];
  const mid = sortedByLuma[Math.floor(sortedByLuma.length / 2)];

  let centroids: RGB[] = [darkest, mid, brightest];
  const assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < K; c++) {
        const d = distSq(pixels[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }

    const sums: [number, number, number, number][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      sums[c][3] += 1;
    }

    const newCentroids: RGB[] = centroids.map((centroid, c) => {
      const count = sums[c][3];
      if (count === 0) return centroid;
      return [sums[c][0] / count, sums[c][1] / count, sums[c][2] / count];
    });
    centroids = newCentroids;

    if (!changed) break;
  }

  const counts = new Array(K).fill(0);
  for (const a of assignments) counts[a]++;

  let largest = 0;
  for (let c = 1; c < K; c++) {
    if (counts[c] > counts[largest]) largest = c;
  }

  const [r, g, b] = centroids[largest];
  return [Math.round(r), Math.round(g), Math.round(b)];
}

const PALETTE: Record<string, RGB> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  gray: [128, 128, 128],
  red: [255, 0, 0],
  orange: [255, 165, 0],
  yellow: [255, 255, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  brown: [139, 69, 19],
  beige: [245, 245, 220],
};

/** Find the palette key whose RGB is nearest (euclidean) to the given color. */
export function nearestColorKey(rgb: RGB): string {
  let best = '';
  let bestDist = Infinity;
  for (const [key, value] of Object.entries(PALETTE)) {
    const d = distSq(rgb, value);
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}
