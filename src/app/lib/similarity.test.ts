import { cosineSimilarity, groupByHamming, groupBySimilarity } from './similarity';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('returns 0 for zero vectors', () => {
    const a = new Float32Array([0, 0]);
    const b = new Float32Array([1, 1]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe('groupBySimilarity', () => {
  it('does not group orthogonal vectors', () => {
    const items = [
      { id: 'a', embedding: new Float32Array([1, 0]) },
      { id: 'b', embedding: new Float32Array([0, 1]) },
    ];
    expect(groupBySimilarity(items, 0.9)).toEqual([]);
  });

  it('groups identical/near-identical vectors', () => {
    const items = [
      { id: 'a', embedding: new Float32Array([1, 0, 0]) },
      { id: 'b', embedding: new Float32Array([0.99, 0.01, 0]) },
    ];
    const groups = groupBySimilarity(items, 0.9);
    expect(groups.length).toBe(1);
    expect(groups[0].sort()).toEqual(['a', 'b']);
  });

  it('chains transitively into one group', () => {
    // a at 0deg, b at 25deg (cos ~0.906 to a), c at 50deg (cos ~0.906 to b,
    // but only ~0.643 to a) -- a and c only join the same group via b.
    const items = [
      { id: 'a', embedding: new Float32Array([1, 0]) },
      { id: 'b', embedding: new Float32Array([Math.cos((25 * Math.PI) / 180), Math.sin((25 * Math.PI) / 180)]) },
      { id: 'c', embedding: new Float32Array([Math.cos((50 * Math.PI) / 180), Math.sin((50 * Math.PI) / 180)]) },
    ];
    expect(cosineSimilarity(items[0].embedding, items[2].embedding)).toBeLessThan(0.9);
    const groups = groupBySimilarity(items, 0.9);
    expect(groups.length).toBe(1);
    expect(groups[0].sort()).toEqual(['a', 'b', 'c']);
  });

  it('excludes singletons', () => {
    const items = [
      { id: 'a', embedding: new Float32Array([1, 0]) },
      { id: 'b', embedding: new Float32Array([0, 1]) },
      { id: 'c', embedding: new Float32Array([1, 0.001]) },
    ];
    const groups = groupBySimilarity(items, 0.999);
    // b stays a singleton and should not appear
    const flat = groups.flat();
    expect(flat).not.toContain('b');
  });

  it('handles empty input', () => {
    expect(groupBySimilarity([], 0.9)).toEqual([]);
  });
});

describe('groupByHamming', () => {
  it('groups phashes within maxDistance', () => {
    const items = [
      { id: 'a', phash: '0000000000000000' },
      { id: 'b', phash: '0000000000000001' },
      { id: 'c', phash: 'ffffffffffffffff' },
    ];
    const groups = groupByHamming(items, 2);
    expect(groups.length).toBe(1);
    expect(groups[0].sort()).toEqual(['a', 'b']);
  });

  it('excludes singletons and handles empty input', () => {
    expect(groupByHamming([{ id: 'a', phash: '0000000000000000' }], 2)).toEqual([]);
    expect(groupByHamming([], 2)).toEqual([]);
  });

  it('chains transitively', () => {
    const items = [
      { id: 'a', phash: '0000000000000000' },
      { id: 'b', phash: '0000000000000003' }, // distance 2 from a
      { id: 'c', phash: '000000000000000f' }, // distance 2 from b, distance 4 from a
    ];
    const groups = groupByHamming(items, 2);
    expect(groups.length).toBe(1);
    expect(groups[0].sort()).toEqual(['a', 'b', 'c']);
  });
});
