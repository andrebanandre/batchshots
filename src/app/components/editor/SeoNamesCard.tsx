'use client';

/**
 * SEO captions & filenames tool section: MobileNet classification + YOLO
 * label + OCR text + dominant color -> deterministic caption + slug.
 * Replaces the old SeoNameGenerator card (same role: SEO filenames),
 * with generated captions alongside.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import { useEditorTools, targetImages, toolSourceUrl } from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';
import { buildCaption, buildSeoName } from '../../lib/captionTemplates';
import { dominantColorFromPixels, nearestColorKey } from '../../lib/colorName';

const COLOR_WORDS: Record<string, string> = {
  black: 'black', white: 'white', gray: 'gray', red: 'red',
  orange: 'orange', yellow: 'yellow', green: 'green', blue: 'blue',
  purple: 'purple', pink: 'pink', brown: 'brown', beige: 'beige',
};

let labelsPromise: Promise<string[]> | null = null;
function getImagenetLabels(): Promise<string[]> {
  if (!labelsPromise) {
    labelsPromise = fetch('https://s3.batchshots.com/models/imagenet_labels.json').then((r) => {
      if (!r.ok) throw new Error('Failed to fetch ImageNet labels');
      return r.json();
    });
  }
  return labelsPromise;
}

async function dominantColorKey(thumbnailDataUrl: string): Promise<string> {
  const bmp = await createImageBitmap(await (await fetch(thumbnailDataUrl)).blob(), {
    resizeWidth: 32,
    resizeHeight: 32,
  });
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const img = ctx.getImageData(0, 0, 32, 32);
    return nearestColorKey(dominantColorFromPixels(img.data));
  } finally {
    bmp.close();
  }
}

export default function SeoNamesCard() {
  const t = useTranslations('CaptionStep');
  const tTools = useTranslations('EditorTools');
  const { images, selectedImageId, updateImage, setToolBusy } = useEditorTools();

  const [applyToAll, setApplyToAll] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);

  const targets = targetImages(images, selectedImageId, applyToAll);

  const run = async () => {
    if (targets.length === 0) return;
    setIsBusy(true);
    setToolBusy(true);
    let failed = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        const image = targets[i];
        setProgress(`${i + 1}/${targets.length}`);
        try {
          const bmp = await bitmapFromUrl(toolSourceUrl(image), 512);
          const [{ topK }, labels, colorKey] = await Promise.all([
            inference.classify(image.id, bmp, { model: 'classifier-hq.onnx' }),
            getImagenetLabels(),
            dominantColorKey(image.thumbnailDataUrl ?? toolSourceUrl(image)),
          ]);
          // Top-3 is fetched (topK defaults to 5 in the worker) so a low-confidence
          // top-1 can be sanity-checked against its runners-up in future iterations;
          // for now the caption uses the top-1 label, but falls back to the YOLO
          // detection label (or a generic fallback) when the classifier isn't
          // confident, since a wrong ImageNet guess reads worse than a generic term.
          const top = topK.slice(0, 3);
          const top1 = top[0];
          const classLabel =
            top1 && top1.score >= 0.25 && top1.classId < labels.length
              ? labels[top1.classId]
              : undefined;
          const caption = buildCaption(
            {
              classLabel,
              detectLabel: image.bbox?.label,
              ocrText: image.ocrText,
              colorKey,
            },
            {
              template: '{color} {label}{ocrHint}',
              colors: COLOR_WORDS,
              fallbackLabel: 'product photo',
            }
          );
          const seoName = buildSeoName(caption, i);
          updateImage(image.id, {
            classLabel,
            dominantColor: colorKey,
            caption,
            seoName,
          });
        } catch {
          failed++;
        }
      }
    } finally {
      setIsBusy(false);
      setToolBusy(false);
      setProgress('');
      setFailedCount(failed);
    }
  };

  const processed = images.filter((i) => i.caption);

  return (
    <SectionCard
      title={t('title')}
      runLabel={t('run')}
      onRun={run}
      runDisabled={targets.length === 0}
      isBusy={isBusy}
      busyLabel={progress}
      applyToAll={applyToAll}
      onApplyToAllChange={setApplyToAll}
    >
      {() => (
        <div className="space-y-4">
          {targets.length === 0 && (
            <p className="text-sm text-gray-600">{tTools('noImageSelected')}</p>
          )}

          <p className="text-sm text-gray-600">{t('editHint')}</p>

          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">{tTools('failed', { count: failedCount })}</p>
          )}

          {processed.length > 0 && (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {processed.map((image) => (
                <div
                  key={image.id}
                  className="brutalist-border p-2 bg-white flex items-start gap-3"
                >
                  <Image
                    src={image.thumbnailDataUrl ?? toolSourceUrl(image)}
                    alt={image.file.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 object-cover brutalist-border shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <label className="block text-xs font-bold uppercase">
                      {t('caption')}
                      <input
                        type="text"
                        defaultValue={image.caption}
                        onBlur={(e) => updateImage(image.id, { caption: e.target.value })}
                        className="block w-full brutalist-border p-1 text-sm font-normal normal-case"
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase">
                      {t('seoName')}
                      <input
                        type="text"
                        defaultValue={image.seoName}
                        onBlur={(e) => updateImage(image.id, { seoName: e.target.value })}
                        className="block w-full brutalist-border p-1 text-sm font-mono font-normal normal-case"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
