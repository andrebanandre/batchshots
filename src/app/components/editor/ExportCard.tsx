'use client';

/**
 * Export tool section: ZIP download with format conversion, SEO/pattern
 * renaming, optional manifest.csv. Replaces DownloadOptions and folds in
 * format conversion from the old image-format-convertor tool.
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import { useEditorTools, toolSourceUrl } from '../../contexts/EditorToolsContext';
import { resizeAndEncode, encodeToTargetSize } from '../../lib/imageOps';
import { ImageFile } from '../ImagePreview';
import FormatConversionSettings, {
  defaultFormatConversionOptions,
} from './FormatConversionSettings';
import type { BatchDownloadOptions } from '../../contexts/EditorToolsContext';

const EXT_BY_FORMAT: Record<BatchDownloadOptions['format'], string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function itemBlob(
  image: ImageFile,
  options: BatchDownloadOptions
): Promise<Blob> {
  const source = toolSourceUrl(image);
  const resizeOptions = {
    width: options.width ?? image.width ?? 10000,
    height: options.height,
    format: options.format,
    sharpen: false,
  };
  if (options.maxFileSizeKb) {
    return encodeToTargetSize(
      source,
      resizeOptions,
      options.maxFileSizeKb * 1024
    );
  }
  return resizeAndEncode(source, {
    ...resizeOptions,
    quality: options.quality,
  });
}

export default function ExportCard() {
  const t = useTranslations('ExportStep');
  const { images, prepareForExport } = useEditorTools();

  const [conversionOptions, setConversionOptions] = useState(
    defaultFormatConversionOptions
  );
  const [useSeoNames, setUseSeoNames] = useState(true);
  const [renamePattern, setRenamePattern] = useState('');
  const [includeManifest, setIncludeManifest] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState('');

  const activeImages = images.filter((i) => !i.excluded);

  const downloadZip = async () => {
    if (activeImages.length === 0) return;
    setIsBusy(true);
    setDone(false);
    try {
      // Bake pending adjustments/preset/watermark at full size first
      // (editor supplies this; tool outputs are preserved by the page).
      const baked = prepareForExport ? await prepareForExport() : images;
      const exportImages = baked.filter((i) => !i.excluded);
      const zip = new JSZip();
      const used = new Set<string>();
      const manifestRows: string[] = [
        'filename,original,caption,ocr_text,quality_flags',
      ];

      for (let i = 0; i < exportImages.length; i++) {
        const image = exportImages[i];
        setProgress(`${i + 1}/${exportImages.length}`);
        const blob = await itemBlob(image, conversionOptions);
        const originalBase = image.file.name.replace(/\.[^.]+$/, '');
        let base: string;
        if (renamePattern.includes('{n}')) {
          base = renamePattern.replace('{n}', String(i + 1));
        } else if (useSeoNames && image.seoName) {
          base = image.seoName;
        } else {
          base = originalBase;
        }
        const ext = EXT_BY_FORMAT[conversionOptions.format];
        let name = `${base}.${ext}`;
        for (let suffix = 2; used.has(name); suffix++) {
          name = `${base}-${suffix}.${ext}`;
        }
        used.add(name);
        zip.file(name, blob);
        if (includeManifest) {
          manifestRows.push(
            [
              csvEscape(name),
              csvEscape(image.file.name),
              csvEscape(image.caption ?? ''),
              csvEscape(image.ocrText ?? ''),
              csvEscape((image.quality?.flags ?? []).join('|')),
            ].join(',')
          );
        }
      }

      if (includeManifest) {
        zip.file('manifest.csv', manifestRows.join('\n'));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'batchshots-export.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
    } finally {
      setIsBusy(false);
      setProgress('');
    }
  };

  return (
    <SectionCard
      title={t('title')}
      runLabel={isBusy ? t('downloading') : t('download')}
      onRun={downloadZip}
      runDisabled={activeImages.length === 0}
      isBusy={isBusy}
      busyLabel={progress}
    >
      {() => (
        <div className="space-y-6">
          <p className="font-bold uppercase">
            {t('imagesReady', { count: activeImages.length })}
          </p>

          <FormatConversionSettings
            options={conversionOptions}
            onChange={setConversionOptions}
          />

          <div className="brutalist-border p-3 space-y-3 text-sm font-bold">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={useSeoNames}
                  onChange={(e) => setUseSeoNames(e.target.checked)}
                />
                {t('useSeoNames')}
              </label>
              <input
                type="text"
                value={renamePattern}
                onChange={(e) => setRenamePattern(e.target.value)}
                placeholder={t('renamePattern')}
                className="brutalist-border px-2 py-1 bg-white font-mono font-normal w-56"
              />
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={includeManifest}
                  onChange={(e) => setIncludeManifest(e.target.checked)}
                />
                {t('includeManifest')}
              </label>
            </div>
          </div>

          {done && (
            <div className="brutalist-border p-3 bg-green-100 font-bold inline-block">
              {t('downloadComplete')}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
