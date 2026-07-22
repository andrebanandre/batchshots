'use client';

/**
 * Auto-crop tool section: YOLOv8n product detection -> crop + margin,
 * optional square canvas / white background / fixed output size.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import { useEditorTools, targetImages, toolSourceUrl } from '../../contexts/EditorToolsContext';
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
  const { images, selectedImageId, updateImage, setToolBusy } = useEditorTools();

  const [applyToAll, setApplyToAll] = useState(true);
  const [square, setSquare] = useState(true);
  const [whiteBackground, setWhiteBackground] = useState(true);
  const [marginPct, setMarginPct] = useState(0.05);
  const [outputSize, setOutputSize] = useState<number | null>(null);
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
          const source = toolSourceUrl(image);
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
            marginPct,
            square,
            background: whiteBackground ? '#ffffff' : null,
            outputSize: outputSize ?? undefined,
          });
          if (image.processedDataUrl && image.processedDataUrl.startsWith('blob:')) {
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

  const processed = images.filter((i) => i.bbox !== undefined || i.processedDataUrl);

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
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={square}
                  onChange={(e) => setSquare(e.target.checked)}
                />
                {t('square')}
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={whiteBackground}
                  onChange={(e) => setWhiteBackground(e.target.checked)}
                />
                {t('whiteBackground')}
              </label>
            </div>
          )}

          {tab === 'advanced' && (
            <div className="space-y-3 text-sm font-bold">
              <label className="flex items-center gap-2">
                {t('margin')}
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.01}
                  value={marginPct}
                  onChange={(e) => setMarginPct(Number(e.target.value))}
                />
                <span className="font-mono">{Math.round(marginPct * 100)}%</span>
              </label>
              <label className="flex items-center gap-1">
                {t('outputSize')}
                <select
                  value={outputSize ?? ''}
                  onChange={(e) =>
                    setOutputSize(e.target.value ? Number(e.target.value) : null)
                  }
                  className="brutalist-border px-1 py-0.5 bg-white"
                >
                  <option value="">—</option>
                  <option value="1200">1200</option>
                  <option value="1600">1600</option>
                  <option value="2000">2000</option>
                </select>
              </label>
            </div>
          )}

          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">{tTools('failed', { count: failedCount })}</p>
          )}

          {processed.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto">
              {processed.map((image) => (
                <div key={image.id} className="brutalist-border p-1 bg-white">
                  <Image
                    src={image.processedThumbnailUrl ?? image.thumbnailDataUrl ?? toolSourceUrl(image)}
                    alt={image.file.name}
                    width={128}
                    height={128}
                    unoptimized
                    className="w-full aspect-square object-contain"
                  />
                  <p className="text-[10px] font-mono truncate">
                    {image.bbox
                      ? t('detected', {
                          label: image.bbox.label,
                          pct: Math.round(image.bbox.score * 100),
                        })
                      : t('noDetection')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
