'use client';

/** Extracts Markdown-formatted text from images, PDFs, DOCX and PPTX files. */

import React, { useState } from 'react';
import Image from 'next/image';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import { useEditorTools, toolSourceUrl } from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';
import type { ImageFile } from '../ImagePreview';

const MAX_PDF_PAGES = 50;
const MIN_CHARS_PER_PAGE = 20;

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

function normalizeMarkdown(value: string): string {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainTextToMarkdown(value: string): string {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return normalizeMarkdown(
    lines
      .map((line) => {
        const letters = line.replace(/[^\p{L}]/gu, '');
        const isShortHeading =
          line.length <= 80 &&
          letters.length >= 3 &&
          letters === letters.toLocaleUpperCase();
        return isShortHeading ? `### ${line}` : line;
      })
      .join('\n\n')
  );
}

function htmlToMarkdown(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  const render = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.replace(/\s+/g, ' ') ?? '';
    }
    if (!(node instanceof HTMLElement)) return '';

    const content = Array.from(node.childNodes).map(render).join('').trim();
    const tag = node.tagName.toLowerCase();
    if (!content && tag !== 'br') return '';

    if (/^h[1-6]$/.test(tag)) {
      return `${'#'.repeat(Number(tag[1]))} ${content}\n\n`;
    }
    if (tag === 'p' || tag === 'div') return `${content}\n\n`;
    if (tag === 'strong' || tag === 'b') return `**${content}**`;
    if (tag === 'em' || tag === 'i') return `*${content}*`;
    if (tag === 'br') return '\n';
    if (tag === 'li') {
      const ordered = node.parentElement?.tagName.toLowerCase() === 'ol';
      const index = ordered
        ? Array.from(node.parentElement?.children ?? []).indexOf(node) + 1
        : 0;
      return `${ordered ? `${index}.` : '-'} ${content}\n`;
    }
    if (tag === 'ul' || tag === 'ol') return `${content}\n`;
    if (tag === 'a') {
      const href = node.getAttribute('href');
      return href ? `[${content}](${href})` : content;
    }
    if (tag === 'tr') {
      const cells = Array.from(node.children)
        .map((cell) => render(cell).trim())
        .filter(Boolean);
      return cells.length ? `| ${cells.join(' | ')} |\n` : '';
    }
    if (tag === 'td' || tag === 'th') return content;
    if (tag === 'table') return `\n${content}\n`;
    return content;
  };

  return normalizeMarkdown(Array.from(parsed.body.childNodes).map(render).join(''));
}

function withTitle(filename: string, markdown: string, noText: string): string {
  const body = normalizeMarkdown(markdown) || `_${noText}_`;
  return `# ${baseName(filename)}\n\n${body}`;
}

async function extractPdfMarkdown(
  file: File,
  pageHeading: (page: number) => string,
  onPageProgress?: (page: number, total: number) => void
): Promise<{ markdown: string; pages: number }> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    onPageProgress?.(pageNum, pageCount);
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = '';

    for (const item of content.items) {
      if (!('str' in item)) continue;
      currentLine += `${currentLine ? ' ' : ''}${item.str}`;
      if (item.hasEOL) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
      }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    let body = plainTextToMarkdown(lines.join('\n'));
    if (body.replace(/[#*_\s-]/g, '').length < MIN_CHARS_PER_PAGE) {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (blob) {
          const bitmap = await createImageBitmap(blob);
          try {
            const result = await inference.ocr(`pdf-page-${pageNum}`, bitmap);
            body = result.markdown || plainTextToMarkdown(result.joined);
          } finally {
            bitmap.close();
          }
        }
      }
    }
    pages.push(`## ${pageHeading(pageNum)}\n\n${body}`);
  }

  return { markdown: pages.join('\n\n---\n\n'), pages: pageCount };
}

async function extractDocxMarkdown(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return htmlToMarkdown(value);
}

async function extractPptxMarkdown(
  file: File,
  slideHeading: (slide: number) => string
): Promise<{ markdown: string; pages: number }> {
  const zip = await JSZip.loadAsync(file);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const left = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10);
      const right = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10);
      return left - right;
    });

  const slides: string[] = [];
  for (let index = 0; index < slideFiles.length; index++) {
    const xml = await zip.files[slideFiles[index]].async('text');
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    const paragraphs = Array.from(parsed.getElementsByTagNameNS('*', 'p'))
      .map((paragraph) =>
        Array.from(paragraph.getElementsByTagNameNS('*', 't'))
          .map((node) => node.textContent ?? '')
          .join('')
          .trim()
      )
      .filter(Boolean);
    slides.push(
      `## ${slideHeading(index + 1)}\n\n${paragraphs
        .map((paragraph) => `- ${paragraph}`)
        .join('\n')}`
    );
  }

  return { markdown: slides.join('\n\n---\n\n'), pages: slideFiles.length };
}

function ResultIcon({ item }: { item: ImageFile }) {
  if (item.documentType) {
    return (
      <div className="w-12 h-12 brutalist-border bg-black text-white flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold uppercase">{item.documentType}</span>
      </div>
    );
  }
  if (!item.thumbnailDataUrl) return null;
  return (
    <Image
      src={item.thumbnailDataUrl}
      alt={item.originalName ?? item.file.name}
      width={48}
      height={48}
      unoptimized
      className="w-12 h-12 object-cover brutalist-border shrink-0"
    />
  );
}

export default function TextExtractTool() {
  const t = useTranslations('OcrStep');
  const tTools = useTranslations('EditorTools');
  const { images, updateImage, setToolBusy } = useEditorTools();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const targets = images.filter((item) => !item.excluded);
  const processed = images.filter((item) => item.ocrText !== undefined);

  const run = async () => {
    if (targets.length === 0) return;
    setToolBusy(true);
    setBusy(true);
    setFailedCount(0);
    let failed = 0;

    try {
      for (let index = 0; index < targets.length; index++) {
        const item = targets[index];
        setProgress(`${index + 1}/${targets.length}: ${item.file.name}`);
        try {
          let markdown = '';
          let pageCount: number | undefined;
          if (item.documentType === 'pdf') {
            const result = await extractPdfMarkdown(
              item.file,
              (page) => t('pageHeading', { page }),
              (page, total) =>
                setProgress(
                  `${index + 1}/${targets.length}: ${item.file.name} · ${t('pageProgress', { page, total })}`
                )
            );
            markdown = result.markdown;
            pageCount = result.pages;
          } else if (item.documentType === 'docx') {
            markdown = await extractDocxMarkdown(item.file);
          } else if (item.documentType === 'pptx') {
            const result = await extractPptxMarkdown(item.file, (slide) =>
              t('slideHeading', { slide })
            );
            markdown = result.markdown;
            pageCount = result.pages;
          } else {
            const bitmap = await bitmapFromUrl(toolSourceUrl(item), 1600);
            try {
              const result = await inference.ocr(item.id, bitmap);
              markdown = result.markdown || plainTextToMarkdown(result.joined);
            } finally {
              bitmap.close();
            }
          }

          updateImage(item.id, {
            ocrText: withTitle(item.file.name, markdown, t('noText')),
            pageCount,
          });
        } catch {
          failed += 1;
        }
      }
      setFailedCount(failed);
    } finally {
      setProgress('');
      setBusy(false);
      setToolBusy(false);
    }
  };

  const downloadZip = async () => {
    if (processed.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      for (const item of processed) {
        const base = baseName(item.originalName ?? item.file.name);
        let filename = `${base}.txt`;
        let suffix = 2;
        while (usedNames.has(filename)) filename = `${base}-${suffix++}.txt`;
        usedNames.add(filename);
        zip.file(filename, `${item.ocrText?.trim() || `# ${base}\n\n_${t('noText')}_`}\n`);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'extracted-text.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 100);
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
            <p className="text-sm text-gray-600">{t('noFilesSelected')}</p>
          )}
          <p className="text-sm text-gray-600">{t('editHint')}</p>
          {failedCount > 0 && (
            <p className="text-sm font-bold text-red-600">
              {tTools('failed', { count: failedCount })}
            </p>
          )}

          {processed.length > 0 && (
            <>
              <div className="space-y-4 max-h-[720px] overflow-y-auto">
                {processed.map((item) => (
                  <div key={item.id} className="brutalist-border p-3 bg-white space-y-3">
                    <div className="flex items-center gap-3">
                      <ResultIcon item={item} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" title={item.file.name}>
                          {item.file.name}
                        </p>
                        {typeof item.pageCount === 'number' && (
                          <p className="text-xs text-gray-500">
                            {t('pages', { count: item.pageCount })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-xs font-bold uppercase">{t('markdownPreview')}</span>
                      <div className="brutalist-border p-4 min-h-[180px] max-h-[520px] overflow-auto text-sm bg-gray-50">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h3 className="text-xl font-bold mb-3">{children}</h3>,
                            h2: ({ children }) => <h4 className="text-lg font-bold mt-4 mb-2">{children}</h4>,
                            h3: ({ children }) => <h5 className="font-bold mt-3 mb-1">{children}</h5>,
                            p: ({ children }) => <p className="mb-2 whitespace-pre-wrap">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                            hr: () => <hr className="border-t-2 border-black my-4" />,
                          }}
                        >
                          {item.ocrText ?? ''}
                        </ReactMarkdown>
                      </div>
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
