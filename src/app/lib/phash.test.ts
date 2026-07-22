import { hammingDistanceHex, lumaFromImageData, phashFromLuma } from './phash';

function makeLuma(width: number, height: number, fn: (x: number, y: number) => number): Float32Array {
  const luma = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      luma[y * width + x] = fn(x, y);
    }
  }
  return luma;
}

function makeRandomLuma(width: number, height: number, seed: number): Float32Array {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return makeLuma(width, height, () => rand() * 255);
}

describe('phash', () => {
  it('produces a 16-char lowercase hex hash', () => {
    const luma = makeLuma(64, 64, (x, y) => (x + y) % 255);
    const hash = phashFromLuma(luma, 64, 64);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic for identical input', () => {
    const luma = makeLuma(64, 64, (x, y) => (x * 3 + y * 7) % 255);
    const h1 = phashFromLuma(luma, 64, 64);
    const h2 = phashFromLuma(luma, 64, 64);
    expect(h1).toBe(h2);
  });

  it('identical luma buffers produce distance 0', () => {
    const luma = makeLuma(48, 48, (x, y) => Math.sin(x) * 100 + y);
    const h1 = phashFromLuma(luma, 48, 48);
    const h2 = phashFromLuma(luma, 48, 48);
    expect(hammingDistanceHex(h1, h2)).toBe(0);
  });

  it('small brightness shift keeps hashes close', () => {
    const luma = makeLuma(64, 64, (x, y) => 50 + ((x * 5 + y * 11) % 150));
    const shifted = luma.map((v) => Math.min(255, v + 10));
    const h1 = phashFromLuma(luma, 64, 64);
    const h2 = phashFromLuma(shifted, 64, 64);
    expect(hammingDistanceHex(h1, h2)).toBeLessThanOrEqual(6);
  });

  it('random vs. its inverse yields a large distance', () => {
    const luma = makeRandomLuma(64, 64, 42);
    const inverse = luma.map((v) => 255 - v);
    const h1 = phashFromLuma(luma, 64, 64);
    const h2 = phashFromLuma(inverse, 64, 64);
    expect(hammingDistanceHex(h1, h2)).toBeGreaterThan(20);
  });

  it('lumaFromImageData converts RGBA to luma correctly', () => {
    // 2x1 image: white pixel, black pixel
    const data = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    const luma = lumaFromImageData(data, 2, 1);
    expect(luma.length).toBe(2);
    expect(luma[0]).toBeCloseTo(255, 0);
    expect(luma[1]).toBeCloseTo(0, 0);
  });

  it('hammingDistanceHex throws on length mismatch', () => {
    expect(() => hammingDistanceHex('ab', 'abcd')).toThrow();
  });

  it('hammingDistanceHex computes correct bit differences', () => {
    expect(hammingDistanceHex('0000000000000000', '0000000000000001')).toBe(1);
    expect(hammingDistanceHex('ffffffffffffffff', '0000000000000000')).toBe(64);
  });
});
