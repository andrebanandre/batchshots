import { hammingDistanceHex } from './phash';

/** Cosine similarity between two equal-length vectors. Returns 0 for zero vectors. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('cosineSimilarity: vector length mismatch');
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Simple union-find over string ids. */
class UnionFind {
  private parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    let root = id;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root) as string;
    }
    // path compression
    let cur = id;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur) as string;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }

  groups(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const arr = out.get(root);
      if (arr) arr.push(id);
      else out.set(root, [id]);
    }
    return out;
  }
}

/** Group items whose embeddings have pairwise cosine similarity >= threshold. */
export function groupBySimilarity(
  items: { id: string; embedding: Float32Array }[],
  threshold: number
): string[][] {
  const uf = new UnionFind();
  for (const item of items) uf.add(item.id);

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (cosineSimilarity(items[i].embedding, items[j].embedding) >= threshold) {
        uf.union(items[i].id, items[j].id);
      }
    }
  }

  return [...uf.groups().values()].filter((g) => g.length >= 2);
}

/** Group items whose phashes have pairwise hamming distance <= maxDistance. */
export function groupByHamming(
  items: { id: string; phash: string }[],
  maxDistance: number
): string[][] {
  const uf = new UnionFind();
  for (const item of items) uf.add(item.id);

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (hammingDistanceHex(items[i].phash, items[j].phash) <= maxDistance) {
        uf.union(items[i].id, items[j].id);
      }
    }
  }

  return [...uf.groups().values()].filter((g) => g.length >= 2);
}
