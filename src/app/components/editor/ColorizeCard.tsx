'use client';

/**
 * Photo colorization tool section: Zhang et al. siggraph17 net (Lab ab
 * prediction from L) via the shared OpenCV inference worker. Presets tab is
 * informational only; advanced tab exposes a blend slider that fades the
 * predicted color back toward the original image (alpha-composited on
 * canvas, not re-run through the model).
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import { useEditorTools, targetImages, toolSourceUrl } from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';
import { canvasToBlob } from '../../lib/imageOps';

export default function ColorizeCard() {
  const t = useTranslations('ColorizeStep');
  const tTools = useTranslations('EditorTools');
  const { images, selectedImageId, updateImage, setToolBusy } = useEditorTools();

  const [applyToAll, setApplyToAll] = useState(true);
  const [blend, setBlend] = useState(100);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);

  const targets = targetImages(images, selectedImageId, applyToAll);

  const processItem = async (id: string) => {
    const image = images.find((i) => i.id === id);
    if (!image) return;
    const sourceUrl = toolSourceUrl(image);
    if (!sourceUrl) return;
    const bmp = await bitmapFromUrl(sourceUrl);
    let result;
    try {
      result = await inference.colorize(id, bmp, {});
    } finally {
      bmp.close();
    }

    const { pixels, width, height } = result;
    const original = await bitmapFromUrl(sourceUrl);
    let blob: Blob;
    try {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      // Base layer: original image (opaque).
      ctx.drawImage(original, 0, 0, width, height);
      // Colorized layer, alpha-blended by the blend slider.
      const colorCanvas = new OffscreenCanvas(width, height);
      const colorCtx = colorCanvas.getContext('2d')!;
      // Uint8ClampedArray.from() yields a fresh ArrayBuffer-backed copy —
      // the array crossing the worker postMessage boundary is typed with a
      // generic ArrayBufferLike that ImageData's constructor rejects.
      colorCtx.putImageData(new ImageData(Uint8ClampedArray.from(pixels), width, height), 0, 0);
      ctx.globalAlpha = Math.min(1, Math.max(0, blend / 100));
      ctx.drawImage(colorCanvas, 0, 0);
      ctx.globalAlpha = 1;
      blob = await canvasToBlob(canvas, 'image/png');
    } finally {
      original.close();
    }

    if (image.processedDataUrl && image.processedDataUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(image.processedDataUrl);
      } catch {
        /* noop */
      }
    }
    const url = URL.createObjectURL(blob);
    updateImage(id, {
      processedDataUrl: url,
      processedThumbnailUrl: url,
    });
  };

  const run = async () => {
    if (targets.length === 0) return;
    setIsBusy(true);
    setToolBusy(true);
    setFailedCount(0);
    let failed = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        setProgress(`${i + 1}/${targets.length}`);
        try {
          await processItem(targets[i].id);
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

  return (
    <SectionCard
      title={t('title')}
      hasAdvanced
      runLabel={t('run')}
      onRun={run}
      runDisabled={targets.length === 0}
      isBusy={isBusy}
      busyLabel={progress}
      applyToAll={applyToAll}
      onApplyToAllChange={setApplyToAll}
    >
      {(tab) => (
        <div className="space-y-4">
          {targets.length === 0 && (
            <p className="text-sm text-gray-600">{tTools('noImageSelected')}</p>
          )}

          {tab === 'presets' && (
            <p className="text-sm text-gray-600">{t('hint')}</p>
          )}

          {tab === 'advanced' && (
            <label className="flex items-center gap-2 text-sm font-bold">
              {t('blend')}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={blend}
                onChange={(e) => setBlend(Number(e.target.value))}
              />
              <span className="font-mono">{blend}%</span>
            </label>
          )}

          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">{tTools('failed', { count: failedCount })}</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
