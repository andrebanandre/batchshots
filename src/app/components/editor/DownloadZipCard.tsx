'use client';

/**
 * Always-present sidebar card for standalone tool pages: zips up the
 * CURRENT result (processed if available, else original) of every
 * non-excluded image in the active session and downloads it as one ZIP.
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import { useTranslations } from 'next-intl';
import Button from '../Button';
import Card from '../Card';
import { useEditorTools } from '../../contexts/EditorToolsContext';
import { encodeToTargetSize, resizeAndEncode } from '../../lib/imageOps';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extFromFilename(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
}

function baseNameFromFilename(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

export default function DownloadZipCard() {
  const t = useTranslations('DownloadZip');
  const { images, batchDownloadOptions } = useEditorTools();

  const [isBuilding, setIsBuilding] = useState(false);
  const [done, setDone] = useState(false);

  const targets = images.filter((img) => !img.excluded);

  const handleDownload = async () => {
    if (targets.length === 0) return;
    setIsBuilding(true);
    setDone(false);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const image of targets) {
        const source = image.processedDataUrl ?? image.dataUrl;
        if (!source) continue;

        let blob: Blob;
        if (batchDownloadOptions) {
          const resizeOptions = {
            width: batchDownloadOptions.width ?? image.width ?? 10000,
            height: batchDownloadOptions.height,
            format: batchDownloadOptions.format,
            sharpen: false,
          };
          blob = batchDownloadOptions.maxFileSizeKb
            ? await encodeToTargetSize(
                source,
                resizeOptions,
                batchDownloadOptions.maxFileSizeKb * 1024
              )
            : await resizeAndEncode(source, {
                ...resizeOptions,
                quality: batchDownloadOptions.quality,
              });
        } else {
          const response = await fetch(source);
          blob = await response.blob();
        }

        const originalExt = extFromFilename(image.file.name);
        const ext = MIME_TO_EXT[blob.type] ?? originalExt;
        const baseName = image.seoName ?? baseNameFromFilename(image.file.name);

        let filename = `${baseName}.${ext}`;
        let suffix = 2;
        while (usedNames.has(filename)) {
          filename = `${baseName}-${suffix}.${ext}`;
          suffix++;
        }
        usedNames.add(filename);

        zip.file(filename, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `batchshots-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      setDone(true);
    } catch (error) {
      console.error('Error building ZIP:', error);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <Card collapsible={false} title={t('title')}>
      <div className="space-y-3">
        <Button
          variant="accent"
          fullWidth
          onClick={handleDownload}
          disabled={isBuilding || targets.length === 0}
        >
          {isBuilding ? t('building') : t('download')}
        </Button>
        {done && !isBuilding && (
          <p className="text-sm font-bold text-center">{t('done')}</p>
        )}
      </div>
    </Card>
  );
}
