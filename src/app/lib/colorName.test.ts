import { dominantColorFromPixels, nearestColorKey } from './colorName';

function fillPixels(count: number, rgba: [number, number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    data[i * 4] = rgba[0];
    data[i * 4 + 1] = rgba[1];
    data[i * 4 + 2] = rgba[2];
    data[i * 4 + 3] = rgba[3];
  }
  return data;
}

describe('dominantColorFromPixels', () => {
  it('returns the color for a uniform pure-red image', () => {
    const data = fillPixels(100, [255, 0, 0, 255]);
    const [r, g, b] = dominantColorFromPixels(data);
    expect(nearestColorKey([r, g, b])).toBe('red');
  });

  it('ignores transparent pixels', () => {
    const opaque = fillPixels(80, [0, 0, 255, 255]);
    const transparent = fillPixels(20, [255, 0, 0, 50]); // alpha < 128, ignored
    const data = new Uint8ClampedArray([...opaque, ...transparent]);
    const [r, g, b] = dominantColorFromPixels(data);
    expect(nearestColorKey([r, g, b])).toBe('blue');
  });

  it('picks blue as dominant for a 70% blue / 30% white mix', () => {
    const blue = fillPixels(70, [0, 0, 255, 255]);
    const white = fillPixels(30, [255, 255, 255, 255]);
    const data = new Uint8ClampedArray([...blue, ...white]);
    const [r, g, b] = dominantColorFromPixels(data);
    expect(nearestColorKey([r, g, b])).toBe('blue');
  });

  it('is deterministic across repeated calls', () => {
    const blue = fillPixels(40, [10, 20, 200, 255]);
    const green = fillPixels(35, [20, 150, 30, 255]);
    const red = fillPixels(25, [200, 20, 20, 255]);
    const data = new Uint8ClampedArray([...blue, ...green, ...red]);
    const first = dominantColorFromPixels(data);
    const second = dominantColorFromPixels(data);
    expect(first).toEqual(second);
  });

  it('returns black for fully empty/transparent input', () => {
    const data = fillPixels(10, [255, 0, 0, 0]);
    expect(dominantColorFromPixels(data)).toEqual([0, 0, 0]);
  });
});

describe('nearestColorKey', () => {
  it('maps pure colors to expected palette keys', () => {
    expect(nearestColorKey([0, 0, 0])).toBe('black');
    expect(nearestColorKey([255, 255, 255])).toBe('white');
    expect(nearestColorKey([0, 128, 0])).toBe('green');
    expect(nearestColorKey([0, 0, 255])).toBe('blue');
  });
});
