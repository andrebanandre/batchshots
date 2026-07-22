'use client';

/**
 * Background removal tool section: u2netp (fast) / u2net (HQ) via the
 * shared OpenCV inference worker, transparent PNG or white composite.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import { useEditorTools, targetImages } from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';
import { applyMask } from '../../lib/imageOps';

export default function BackgroundCard() {
  const t = useTranslations('BgStep');
  const tTools = useTranslations('EditorTools');
  const { images, selectedImageId, updateImage, setToolBusy } = useEditorTools();

  const [applyToAll, setApplyToAll] = useState(true);
  const [output, setOutput] = useState<'transparent' | 'white'>('transparent');
  const [quality, setQuality] = useState<'fast' | 'hq'>('fast');
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);

  const targets = targetImages(images, selectedImageId, applyToAll);

  const processItem = async (id: string) => {
    const image = images.find((i) => i.id === id);
    if (!image || !image.dataUrl) return;
    const bmp = await bitmapFromUrl(image.dataUrl, 1600);
    const mask = await inference.segment(id, bmp, {
      model: quality === 'hq' ? 'u2net.onnx' : 'u2netp.onnx',
    });
    const blob = await applyMask(
      image.dataUrl,
      mask.mask,
      mask.maskWidth,
      mask.maskHeight,
      output === 'white' ? '#ffffff' : null
    );
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
      backgroundRemoved: true,
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
            <fieldset className="flex items-center gap-4 text-sm font-bold">
              <legend className="sr-only">{t('output')}</legend>
              <span>{t('output')}:</span>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={output === 'white'}
                  onChange={() => setOutput('white')}
                />
                {t('whiteBg')}
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={output === 'transparent'}
                  onChange={() => setOutput('transparent')}
                />
                {t('transparent')}
              </label>
            </fieldset>
          )}

          {tab === 'advanced' && (
            <fieldset className="space-y-2 text-sm font-bold">
              <legend className="sr-only">{t('quality')}</legend>
              <span>{t('quality')}:</span>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={quality === 'fast'}
                  onChange={() => setQuality('fast')}
                />
                {t('fast')}
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={quality === 'hq'}
                  onChange={() => setQuality('hq')}
                />
                {t('hq')}
              </label>
              {quality === 'hq' && (
                <p className="text-xs font-normal text-gray-600">
                  High quality mode is slower — expect longer processing time per image.
                </p>
              )}
            </fieldset>
          )}

          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">{tTools('failed', { count: failedCount })}</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
