'use client';

/**
 * Standalone "Extract text from images & documents" tool:
 *  - batch-runs the OCR inference over every uploaded image (sequentially,
 *    with progress)
 *  - additionally accepts PDF / DOCX / PPTX files dropped into its own
 *    secondary uploader and extracts their text fully client-side
 *      - PDF: text layer via pdf.js when present, else per-page OCR
 *        (rasterize -> inference.ocr) for scanned pages
 *      - DOCX: mammoth raw-text extraction
 *      - PPTX: unzip (jszip) + regex over ppt/slides/slideN.xml
 * Results (images + documents) are reviewed/edited together, then
 * downloaded as one markdown .txt per item bundled into a ZIP.
 */

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import JSZip from 'jszip';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import {
  useEditorTools,
  toolSourceUrl,
} from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';

const MAX_PDF_PAGES = 50;
/** Below this average chars/page, the embedded text layer is treated as
 * absent (scanned page) and the page is rasterized + OCR'd instead. */
const MIN_CHARS_PER_PAGE = 20;
const PAGE_SEPARATOR = '\n\n---\n\n';

type DocType = 'pdf' | 'docx' | 'pptx';

interface DocFile {
  id: string;
  name: string;
  type: DocType;
  text?: string;
  pages?: number;
  error?: boolean;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

function extToType(name: string): DocType | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'pptx') return 'pptx';
  return null;
}

async function extractPdfText(
  file: File,
  onPageProgress?: (page: number, total: number) => void
): Promise<{ text: string; pages: number }> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    onPageProgress?.(pageNum, pageCount);
    const page = await doc.getPage(pageNum);

    const content = await page.getTextContent();
    const layerText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    if (layerText.length >= MIN_CHARS_PER_PAGE) {
      pageTexts.push(layerText);
      continue;
    }

    // Scanned page (no usable text layer): rasterize and OCR it.
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      pageTexts.push(layerText);
      continue;
    }
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) {
      pageTexts.push(layerText);
      continue;
    }
    const bitmap = await createImageBitmap(blob);
    const { joined } = await inference.ocr(`pdf-page-${pageNum}`, bitmap);
    pageTexts.push(joined || layerText);
  }

  return { text: pageTexts.join(PAGE_SEPARATOR), pages: pageCount };
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value.trim();
}

async function extractPptxText(file: File): Promise<{ text: string; pages: number }> {
  const zip = await JSZip.loadAsync(file);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10);
      return na - nb;
    });

  const slideTexts: string[] = [];
  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async('text');
    const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)];
    const text = matches.map((m) => m[1]).join(' ').trim();
    slideTexts.push(text);
  }

  return { text: slideTexts.join(PAGE_SEPARATOR), pages: slideFiles.length };
}

export default function TextExtractTool() {
  const t = useTranslations('OcrStep');
  const tTools = useTranslations('EditorTools');
  const { images, updateImage, setToolBusy } = useEditorTools();

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const [docs, setDocs] = useState<DocFile[]>([]);
  const [docBusy, setDocBusy] = useState(false);
  const [docProgress, setDocProgress] = useState('');
  const [docFailedCount, setDocFailedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targets = images.filter((i) => !i.excluded);

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

  const handleDocFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const queued: DocFile[] = files
      .map((file) => {
        const type = extToType(file.name);
        if (!type) return null;
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          name: file.name,
          type,
        } satisfies DocFile;
      })
      .filter((d): d is DocFile => d !== null);

    if (queued.length === 0) return;

    setDocs((prev) => [...prev, ...queued]);
    setToolBusy(true);
    setDocBusy(true);
    let failed = 0;
    try {
      for (let i = 0; i < queued.length; i++) {
        const doc = queued[i];
        const file = files.find(
          (f) => extToType(f.name) === doc.type && f.name === doc.name
        );
        if (!file) continue;
        setDocProgress(`${i + 1}/${queued.length}: ${doc.name}`);
        try {
          if (doc.type === 'pdf') {
            const { text, pages } = await extractPdfText(file, (page, total) => {
              setDocProgress(
                `${i + 1}/${queued.length}: ${doc.name} (${page}/${total})`
              );
            });
            setDocs((prev) =>
              prev.map((d) => (d.id === doc.id ? { ...d, text, pages } : d))
            );
          } else if (doc.type === 'docx') {
            const text = await extractDocxText(file);
            setDocs((prev) =>
              prev.map((d) => (d.id === doc.id ? { ...d, text } : d))
            );
          } else {
            const { text, pages } = await extractPptxText(file);
            setDocs((prev) =>
              prev.map((d) => (d.id === doc.id ? { ...d, text, pages } : d))
            );
          }
        } catch {
          failed += 1;
          setDocs((prev) =>
            prev.map((d) => (d.id === doc.id ? { ...d, error: true } : d))
          );
        }
      }
      setDocFailedCount(failed);
    } finally {
      setDocBusy(false);
      setToolBusy(false);
      setDocProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateDocText = (id: string, text: string) => {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, text } : d)));
  };

  const processed = images.filter((i) => i.ocrText !== undefined);
  const processedDocs = docs.filter((d) => d.text !== undefined || d.error);

  const downloadZip = async () => {
    if (processed.length === 0 && processedDocs.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const used = new Set<string>();

      const addEntry = (rawName: string, heading: string, text?: string) => {
        const base = baseName(rawName);
        let name = `${base}.txt`;
        for (let suffix = 2; used.has(name); suffix++) {
          name = `${base}-${suffix}.txt`;
        }
        used.add(name);
        const body = text?.trim() ? text : `_${t('noText')}_`;
        zip.file(name, `# ${heading}\n\n${body}\n`);
      };

      for (const image of processed) {
        addEntry(
          image.originalName ?? image.file.name,
          image.originalName ?? image.file.name,
          image.ocrText
        );
      }
      for (const doc of processedDocs) {
        addEntry(doc.name, doc.name, doc.text);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted-text.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
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

          <div className="brutalist-border p-3 bg-gray-50 relative">
            {docBusy && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <p className="text-sm font-bold text-gray-700">{docProgress}</p>
              </div>
            )}
            <label className="block">
              <span className="block text-sm font-bold uppercase mb-2">
                {t('addDocuments')}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx"
                multiple
                onChange={(e) => handleDocFiles(e.target.files)}
                disabled={docBusy}
                className="block w-full text-sm brutalist-border p-2 bg-white disabled:opacity-40"
              />
            </label>
          </div>

          {docFailedCount > 0 && (
            <p className="text-sm font-bold text-red-600">
              {tTools('failed', { count: docFailedCount })}
            </p>
          )}

          {(processed.length > 0 || processedDocs.length > 0) && (
            <>
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
                        width={40}
                        height={40}
                        unoptimized
                        className="w-10 h-10 object-cover brutalist-border shrink-0"
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

                {processedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="brutalist-border p-2 bg-white flex items-start gap-3"
                  >
                    <div className="w-10 h-10 shrink-0 brutalist-border bg-black text-white flex items-center justify-center">
                      <span className="text-[10px] font-bold uppercase leading-none text-center">
                        {doc.type}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-bold truncate" title={doc.name}>
                        {doc.name}
                        {typeof doc.pages === 'number' && (
                          <span className="ml-2 font-normal text-gray-500">
                            {t('pages', { count: doc.pages })}
                          </span>
                        )}
                      </p>
                      {doc.error ? (
                        <p className="text-sm font-bold text-red-600">
                          {tTools('failed', { count: 1 })}
                        </p>
                      ) : (
                        <textarea
                          rows={2}
                          defaultValue={doc.text}
                          placeholder={t('noText')}
                          aria-label={t('textFor', { name: doc.name })}
                          onBlur={(e) => updateDocText(doc.id, e.target.value)}
                          className="w-full brutalist-border p-1 text-sm font-mono"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={downloadZip}
                disabled={downloading}
                className="w-full brutalist-border px-4 py-2 font-bold uppercase bg-white text-black disabled:opacity-40 hover:bg-gray-100"
              >
                {t('downloadZip')}
              </button>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
