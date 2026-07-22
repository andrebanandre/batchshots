'use client';

/**
 * OCR section: PP-OCR det+rec via OpenCV DNN. Extracted text is editable.
 * Ported from steps/OcrPanel.tsx onto the SectionCard / useEditorTools
 * contract.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import {
  useEditorTools,
  targetImages,
  toolSourceUrl,
} from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';

export default function OcrCard() {
  const t = useTranslations('OcrStep');
  const tTools = useTranslations('EditorTools');
  const { images, selectedImageId, updateImage, setToolBusy } =
    useEditorTools();
  const [applyToAll, setApplyToAll] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);

  const targets = targetImages(images, selectedImageId, applyToAll);

  const run = async () => {
    if (targets.length === 0) return;
    setToolBusy(true);
    setBusy(true);
    let failed = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        const image = targets[i];
        setProgress(`${i + 1}/${targets.length}`);
        try {
          const source = toolSourceUrl(image);
          const { joined } = await inference.ocr(
            image.id,
            await bitmapFromUrl(source, 1600)
          );
          updateImage(image.id, { ocrText: joined });
        } catch {
          failed += 1;
          updateImage(image.id, {});
        }
      }
      setFailedCount(failed);
    } finally {
      setBusy(false);
      setToolBusy(false);
    }
  };

  const processed = images.filter((i) => i.ocrText !== undefined);

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
    >
      {() => (
        <div className="space-y-4">
          {targets.length === 0 && (
            <p className="text-sm text-gray-600">{tTools('noImageSelected')}</p>
          )}

          <p className="text-sm text-gray-600">{t('editHint')}</p>

          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">
              {tTools('failed', { count: failedCount })}
            </p>
          )}

          {processed.length > 0 && (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {processed.map((item) => (
                <div
                  key={item.id}
                  className="brutalist-border p-2 bg-white flex items-start gap-3"
                >
                  {item.thumbnailDataUrl && (
                    <Image
                      src={item.thumbnailDataUrl}
                      alt={item.originalName ?? item.file.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="w-12 h-12 object-cover brutalist-border shrink-0"
                    />
                  )}
                  <textarea
                    rows={2}
                    defaultValue={item.ocrText}
                    placeholder={t('noText')}
                    aria-label={t('textFor', {
                      name: item.originalName ?? item.file.name,
                    })}
                    onBlur={(e) => updateImage(item.id, { ocrText: e.target.value })}
                    className="flex-1 brutalist-border p-1 text-sm font-mono"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
