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
import type { Preset } from '../PresetsSelector';

type ExportFormat = 'jpg' | 'png' | 'webp';

const FORMAT_TO_ENCODE: Record<ExportFormat, 'jpeg' | 'png' | 'webp'> = {
  jpg: 'jpeg',
  png: 'png',
  webp: 'webp',
};

const EXT_BY_FORMAT: Record<ExportFormat, string> = {
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
};

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Quality supplied by the selected preset takes priority (preset.quality
 * is a 0-100 percentage); otherwise fall back to the previous default. */
async function itemBlob(
  image: ImageFile,
  keepOriginals: boolean,
  format: ExportFormat,
  currentPreset: Preset | null | undefined,
  maxFileSizeKb: number | null
): Promise<Blob> {
  if (keepOriginals) return image.file;
  const source = toolSourceUrl(image);
  const options = {
    width: currentPreset?.width ?? image.width ?? 4096,
    height: currentPreset?.height ?? null,
    format: FORMAT_TO_ENCODE[format],
    quality: currentPreset ? currentPreset.quality / 100 : 0.9,
    sharpen: false,
  };
  if (maxFileSizeKb) {
    return encodeToTargetSize(source, options, maxFileSizeKb * 1024);
  }
  return resizeAndEncode(source, options);
}

export default function ExportCard() {
  const t = useTranslations('ExportStep');
  const { images, prepareForExport, presetSlot, currentPreset } = useEditorTools();

  const [format, setFormat] = useState<ExportFormat>('jpg');
  const [useSeoNames, setUseSeoNames] = useState(true);
  const [renamePattern, setRenamePattern] = useState('');
  const [includeManifest, setIncludeManifest] = useState(false);
  const [keepOriginals, setKeepOriginals] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState<number | null>(null);
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
        const blob = await itemBlob(image, keepOriginals, format, currentPreset, maxFileSize);
        const originalBase = image.file.name.replace(/\.[^.]+$/, '');
        let base: string;
        if (renamePattern.includes('{n}')) {
          base = renamePattern.replace('{n}', String(i + 1));
        } else if (useSeoNames && image.seoName) {
          base = image.seoName;
        } else {
          base = originalBase;
        }
        const ext = keepOriginals
          ? image.file.name.split('.').pop() || 'jpg'
          : EXT_BY_FORMAT[format];
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
      hasAdvanced
      runLabel={isBusy ? t('downloading') : t('download')}
      onRun={downloadZip}
      runDisabled={activeImages.length === 0}
      isBusy={isBusy}
      busyLabel={progress}
    >
      {(tab) => (
        <div className="space-y-4">
          <p className="font-bold uppercase">
            {t('imagesReady', { count: activeImages.length })}
          </p>

          {tab === 'presets' && <div className="space-y-3">{presetSlot}</div>}

          {tab === 'advanced' && (
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
              <label className="flex items-center gap-1">
                Format
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="brutalist-border px-1 py-0.5 bg-white font-mono"
                >
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WEBP</option>
                </select>
              </label>
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
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={keepOriginals}
                  onChange={(e) => setKeepOriginals(e.target.checked)}
                />
                {t('keepOriginals')}
              </label>
              <label className="flex items-center gap-1">
                Max file size (KB)
                <input
                  type="number"
                  min={1}
                  value={maxFileSize ?? ''}
                  onChange={(e) =>
                    setMaxFileSize(e.target.value ? Number(e.target.value) : null)
                  }
                  className="brutalist-border px-2 py-1 bg-white font-mono font-normal w-24"
                />
              </label>
            </div>
          )}

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
