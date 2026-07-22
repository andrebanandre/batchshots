'use client';

/**
 * Auto-crop tool section: YOLOv8n product detection -> crop + margin,
 * optional square canvas / white background / fixed output size.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import {
  type AutoCropPreviewOptions,
  useEditorTools,
  targetImages,
  toolSourceUrl,
} from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';
import { cropAndPad } from '../../lib/imageOps';

// Minimal COCO class names for display
const COCO_LABELS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
  'toothbrush',
];

export default function AutoCropCard() {
  const t = useTranslations('CropStep');
  const tTools = useTranslations('EditorTools');
  const {
    images,
    selectedImageId,
    updateImage,
    setToolBusy,
    autoCropPreviewOptions,
    setAutoCropPreviewOptions,
  } = useEditorTools();

  const [applyToAll, setApplyToAll] = useState(true);
  const [localOptions, setLocalOptions] = useState<AutoCropPreviewOptions>({
    marginPct: 0.05,
    square: true,
    whiteBackground: true,
    outputSize: null,
  });
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);

  const targets = targetImages(images, selectedImageId, applyToAll);
  const options = autoCropPreviewOptions ?? localOptions;
  const updateOptions = (patch: Partial<AutoCropPreviewOptions>) => {
    const next = { ...options, ...patch };
    if (setAutoCropPreviewOptions && autoCropPreviewOptions) {
      setAutoCropPreviewOptions(next);
    } else {
      setLocalOptions(next);
    }
  };

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
          const source = image.cropSourceDataUrl ?? toolSourceUrl(image);
          const bmp = await bitmapFromUrl(source);
          const imgArea = bmp.width * bmp.height;
          const { boxes } = await inference.detect(image.id, bmp);
          const candidates = boxes.filter((b) => b.w * b.h >= imgArea * 0.02);
          if (candidates.length === 0) {
            updateImage(image.id, { bbox: undefined });
            continue;
          }
          const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
          const bbox = {
            x: best.x,
            y: best.y,
            w: best.w,
            h: best.h,
            label: COCO_LABELS[best.classId] ?? 'product',
            score: best.score,
          };
          const blob = await cropAndPad(source, bbox, {
            marginPct: options.marginPct,
            square: options.square,
            background: options.whiteBackground ? '#ffffff' : null,
            outputSize: options.outputSize ?? undefined,
          });
          if (
            image.processedDataUrl &&
            image.processedDataUrl !== source &&
            image.processedDataUrl.startsWith('blob:')
          ) {
            try {
              URL.revokeObjectURL(image.processedDataUrl);
            } catch {
              /* noop */
            }
          }
          const url = URL.createObjectURL(blob);
          updateImage(image.id, {
            processedDataUrl: url,
            processedThumbnailUrl: url,
            bbox,
            cropSourceDataUrl: source,
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

  const processed = images.filter((i) => i.bbox !== undefined);
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

          <div className="space-y-4">
              <label className="block space-y-2 text-sm font-bold">
                <span className="flex items-center justify-between gap-3">
                  {t('margin')}
                  <output className="brutalist-border bg-white px-2 py-1 font-mono">
                    {Math.round(options.marginPct * 100)}%
                  </output>
                </span>
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.01}
                  value={options.marginPct}
                  onChange={(e) =>
                    updateOptions({ marginPct: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateOptions({ square: !options.square })}
                  aria-pressed={options.square}
                  className={`brutalist-border px-3 py-3 text-sm font-bold ${
                    options.square ? 'bg-primary text-white' : 'bg-white text-black'
                  }`}
                >
                  {t('square')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateOptions({
                      whiteBackground: !options.whiteBackground,
                    })
                  }
                  aria-pressed={options.whiteBackground}
                  className={`brutalist-border px-3 py-3 text-sm font-bold ${
                    options.whiteBackground
                      ? 'bg-primary text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  {t('whiteBackground')}
                </button>
              </div>

              <div className="space-y-2 text-sm font-bold">
                <label htmlFor="crop-output-size">{t('outputSize')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[null, 1200, 1600, 2000].map((size) => (
                    <button
                      key={size ?? 'original'}
                      type="button"
                      onClick={() => updateOptions({ outputSize: size })}
                      aria-pressed={options.outputSize === size}
                      className={`brutalist-border px-2 py-2 font-mono text-xs ${
                        options.outputSize === size
                          ? 'bg-primary text-white'
                          : 'bg-white text-black'
                      }`}
                    >
                      {size ?? '—'}
                    </button>
                  ))}
                </div>
                <input
                  id="crop-output-size"
                  type="number"
                  min={1}
                  max={10000}
                  value={options.outputSize ?? ''}
                  onChange={(e) =>
                    updateOptions({
                      outputSize: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  placeholder="px"
                  className="brutalist-border w-full bg-white px-3 py-2 font-mono font-normal"
                />
              </div>
          </div>

          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">{tTools('failed', { count: failedCount })}</p>
          )}

          {processed.length > 0 && (
            <p className="brutalist-border bg-green-100 p-3 text-sm font-bold">
              {processed.length}/{images.length} · {t('howItWorks.step3.description')}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
