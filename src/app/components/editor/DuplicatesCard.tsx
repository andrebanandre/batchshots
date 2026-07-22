'use client';

/**
 * Duplicates section: pHash prefilter (exact/resized copies) + DINOv2
 * embeddings (near-duplicates), union-find grouping, best-of-group
 * selection. Ported from steps/DedupePanel.tsx onto the SectionCard /
 * useEditorTools contract.
 *
 * This card is controls-only (run button, similarity slider, auto-remove
 * checkbox) — grouping results are rendered in the main ImagePreview grid,
 * not previewed here.
 */

import React, { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import {
  useEditorTools,
  targetImages,
  toolSourceUrl,
} from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';
import { lumaFromImageData, phashFromLuma } from '../../lib/phash';
import { groupByHamming, groupBySimilarity } from '../../lib/similarity';
import { ImageFile } from '../ImagePreview';

const HAMMING_MAX = 8;

async function computePhash(thumbnailUrl: string): Promise<string> {
  const bmp = await createImageBitmap(await (await fetch(thumbnailUrl)).blob(), {
    resizeWidth: 64,
    resizeHeight: 64,
  });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const img = ctx.getImageData(0, 0, 64, 64);
    return phashFromLuma(lumaFromImageData(img.data, 64, 64), 64, 64);
  } finally {
    bmp.close();
  }
}

/** Merge overlapping groups from both passes into unified groups. */
function mergeGroups(a: string[][], b: string[][]): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== undefined && parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    parent.set(x, root);
    return root;
  };
  const union = (x: string, y: string) => {
    parent.set(find(x), find(y));
  };
  for (const group of [...a, ...b]) {
    for (const id of group) {
      if (!parent.has(id)) parent.set(id, id);
      union(group[0], id);
    }
  }
  const byRoot = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    byRoot.set(root, [...(byRoot.get(root) ?? []), id]);
  }
  return [...byRoot.values()].filter((g) => g.length >= 2);
}

function computeGroupPatches(
  images: ImageFile[],
  threshold: number
): { patches: { id: string; patch: Partial<ImageFile> }[]; groups: string[][] } {
  const withPhash = images.filter(
    (i): i is ImageFile & { phash: string } => !!i.phash
  );
  const withEmb = images.filter(
    (i): i is ImageFile & { embedding: Float32Array } => !!i.embedding
  );
  const groups = mergeGroups(
    groupByHamming(withPhash, HAMMING_MAX),
    groupBySimilarity(withEmb, threshold)
  );
  const byId = new Map(images.map((i) => [i.id, i]));
  const patches: { id: string; patch: Partial<ImageFile> }[] = [];
  const grouped = new Set(groups.flat());

  for (const group of groups) {
    // Best = highest resolution
    const best = group.reduce((acc, id) => {
      const a = byId.get(acc)!;
      const b = byId.get(id)!;
      const areaA = (a.width ?? 0) * (a.height ?? 0);
      const areaB = (b.width ?? 0) * (b.height ?? 0);
      return areaB > areaA ? id : acc;
    });
    for (const id of group) {
      patches.push({
        id,
        patch:
          id === best
            ? { duplicateOf: null, excluded: false }
            : { duplicateOf: best, excluded: true },
      });
    }
  }
  // Ungrouped items: clear any stale grouping
  for (const item of images) {
    if (!grouped.has(item.id) && item.duplicateOf) {
      patches.push({ id: item.id, patch: { duplicateOf: null, excluded: false } });
    }
  }
  return { patches, groups };
}

export default function DuplicatesCard() {
  const t = useTranslations('DedupeStep');
  const tTools = useTranslations('EditorTools');
  const { images, selectedImageId, updateImage, updateImages, removeImages, setToolBusy } =
    useEditorTools();
  const [applyToAll, setApplyToAll] = useState(true);
  const [threshold, setThreshold] = useState(0.92);
  const [autoRemove, setAutoRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [lastGroupCount, setLastGroupCount] = useState(0);

  const targets = targetImages(images, selectedImageId, applyToAll);

  /** Apply grouping results: either remove duplicates outright (autoRemove)
   * or just mark them excluded (existing behavior). */
  const applyGrouping = useCallback(
    (imgs: ImageFile[], th: number) => {
      const { patches, groups } = computeGroupPatches(imgs, th);
      if (autoRemove) {
        const duplicateIds = groups.flatMap((group) => {
          const byId = new Map(imgs.map((i) => [i.id, i]));
          const best = group.reduce((acc, id) => {
            const a = byId.get(acc)!;
            const b = byId.get(id)!;
            const areaA = (a.width ?? 0) * (a.height ?? 0);
            const areaB = (b.width ?? 0) * (b.height ?? 0);
            return areaB > areaA ? id : acc;
          });
          return group.filter((id) => id !== best);
        });
        // Still apply patches (clears stale grouping on ungrouped items,
        // marks best as kept) before removing the duplicates themselves.
        const keepPatches = patches.filter((p) => !duplicateIds.includes(p.id));
        if (keepPatches.length > 0) updateImages(keepPatches);
        if (duplicateIds.length > 0 && removeImages) removeImages(duplicateIds);
      } else if (patches.length > 0) {
        updateImages(patches);
      }
      setLastGroupCount(groups.length);
    },
    [autoRemove, updateImages, removeImages]
  );

  const onThreshold = (value: number) => {
    setThreshold(value);
    if (hasRun) applyGrouping(images, value);
  };

  const run = async () => {
    if (targets.length === 0) return;
    setToolBusy(true);
    setBusy(true);
    let failed = 0;
    const computed = new Map<
      string,
      { phash: string; embedding: Float32Array }
    >();
    try {
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        setProgress(`${i + 1}/${targets.length}`);
        try {
          const source = toolSourceUrl(target);
          const thumb = target.thumbnailDataUrl ?? source;
          const phash = await computePhash(thumb);
          const { embedding } = await inference.embed(
            target.id,
            await bitmapFromUrl(source, 512)
          );
          computed.set(target.id, { phash, embedding });
          updateImage(target.id, { phash, embedding });
        } catch {
          failed += 1;
          updateImage(target.id, {});
        }
      }
      setFailedCount(failed);

      const merged = images.map((img) => {
        const c = computed.get(img.id);
        return c ? { ...img, ...c } : img;
      });
      applyGrouping(merged, threshold);
      setHasRun(true);
    } finally {
      setBusy(false);
      setToolBusy(false);
    }
  };

  return (
    <SectionCard
      title={t('title')}
      runLabel={t('run')}
      onRun={run}
      runDisabled={targets.length === 0}
      isBusy={busy}
      busyLabel={progress}
      applyToAll={applyToAll}
      onApplyToAllChange={setApplyToAll}
      hasAdvanced
    >
      {(tab) => (
        <div className="space-y-4">
          {targets.length === 0 && (
            <p className="text-sm text-gray-600">{tTools('noImageSelected')}</p>
          )}

          {tab === 'presets' && (
            <>
              <p className="text-sm text-gray-600">{t('phashPass')}</p>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={autoRemove}
                  onChange={(e) => setAutoRemove(e.target.checked)}
                />
                {t('autoRemove')}
              </label>
            </>
          )}

          {tab === 'advanced' && (
            <label className="flex items-center gap-2 text-sm font-bold">
              {t('threshold')}
              <input
                type="range"
                min={0.8}
                max={0.99}
                step={0.01}
                value={threshold}
                onChange={(e) => onThreshold(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono">{threshold.toFixed(2)}</span>
            </label>
          )}

          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">
              {tTools('failed', { count: failedCount })}
            </p>
          )}

          {hasRun && lastGroupCount === 0 && (
            <div className="brutalist-border p-4 bg-green-100 font-bold">
              {t('noDuplicates')}
            </div>
          )}

          {hasRun && lastGroupCount > 0 && (
            <p className="font-bold uppercase">
              {t('groupsFound', { count: lastGroupCount })}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
