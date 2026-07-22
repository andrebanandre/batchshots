'use client';

/**
 * Object removal tool: user paints (brush strokes) over unwanted objects on
 * the selected image; the painted areas are inpainted via classical
 * cv.inpaint (Telea algorithm) in the shared OpenCV inference worker.
 *
 * NOT latent-diffusion inpainting — those models are far too large/slow to
 * run client-side on CPU. Telea reconstructs masked regions from nearby
 * texture/color; it works well for small-to-medium objects on relatively
 * uniform backgrounds, not generative content synthesis. Revisit if a
 * sufficiently small diffusion inpainting ONNX model ever becomes viable
 * for this build.
 *
 * Painting UI: a transparent canvas is layered on top of the displayed
 * (scaled-to-fit) selected image. Strokes are stored as normalized (0..1)
 * points + a normalized brush radius so the same painted mask can be
 * rescaled onto each target image's own natural dimensions when "apply to
 * all" is enabled.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionCard from './SectionCard';
import { useEditorTools, targetImages, toolSourceUrl } from '../../contexts/EditorToolsContext';
import { inference, bitmapFromUrl } from '../../lib/inferenceClient';
import { canvasToBlob } from '../../lib/imageOps';

const MAX_DISPLAY_WIDTH = 500;
const MIN_BRUSH = 10;
const MAX_BRUSH = 80;
const DEFAULT_BRUSH = 30;

interface NormPoint {
  x: number;
  y: number;
}

interface Stroke {
  points: NormPoint[];
  /** Brush radius as a fraction of the canvas width at paint time. */
  brushNorm: number;
}

/** Rasterize normalized strokes into a 0/255 single-channel mask at target dims. */
function buildMask(strokes: Stroke[], width: number, height: number): Uint8Array {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    const lineWidth = Math.max(2, stroke.brushNorm * width);
    ctx.lineWidth = lineWidth;
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
    }
    ctx.stroke();
  }
  const imageData = ctx.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = imageData.data[i * 4];
  return mask;
}

export default function ObjectRemovalTool() {
  const t = useTranslations('ObjectRemoveStep');
  const tTools = useTranslations('EditorTools');
  const { images, selectedImageId, updateImage, setToolBusy } = useEditorTools();

  const [applyAllAreas, setApplyAllAreas] = useState(false);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [strokeCount, setStrokeCount] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [failedCount, setFailedCount] = useState(0);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);

  const selectedImage = images.find((i) => i.id === selectedImageId) ?? null;
  const selectedSrc = selectedImage ? toolSourceUrl(selectedImage) : '';

  // Painted areas are specific to the selected image — reset on switch, and
  // measure its natural size via an off-DOM Image (more reliable than the
  // <img> onLoad prop, which can race React's commit for already-decoded
  // data: URLs).
  useEffect(() => {
    strokesRef.current = [];
    setStrokeCount(0);
    setDisplaySize(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (!selectedSrc) return;
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (cancelled) return;
      const naturalW = probe.naturalWidth || 1;
      const naturalH = probe.naturalHeight || 1;
      const width = Math.min(MAX_DISPLAY_WIDTH, naturalW);
      const height = Math.round((width / naturalW) * naturalH);
      setDisplaySize({ width, height });
    };
    probe.src = selectedSrc;
    return () => {
      cancelled = true;
    };
  }, [selectedImageId]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): NormPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  };

  const drawSegment = (from: NormPoint | null, to: NormPoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    if (from) {
      ctx.beginPath();
      ctx.moveTo(from.x * w, from.y * h);
      ctx.lineTo(to.x * w, to.y * h);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(to.x * w, to.y * h, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!selectedImage || isBusy) return;
    const point = getCanvasPoint(e);
    if (!point) return;
    try {
      canvasRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const brushNorm = canvas && canvas.width > 0 ? brushSize / canvas.width : 0;
    strokesRef.current.push({ points: [point], brushNorm });
    drawSegment(null, point);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = getCanvasPoint(e);
    if (!point) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);
    drawSegment(prev, point);
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    setStrokeCount(strokesRef.current.length);
  };

  const clearStrokes = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const targets = applyAllAreas
    ? targetImages(images, selectedImageId, true)
    : selectedImage
      ? [selectedImage]
      : [];

  const processItem = async (id: string, strokes: Stroke[]) => {
    const image = images.find((i) => i.id === id);
    if (!image) return;
    const sourceUrl = toolSourceUrl(image);
    if (!sourceUrl) return;
    const bmp = await bitmapFromUrl(sourceUrl);
    const width = bmp.width;
    const height = bmp.height;
    const mask = buildMask(strokes, width, height);
    let result;
    try {
      result = await inference.inpaint(id, bmp, {
        mask,
        maskWidth: width,
        maskHeight: height,
      });
    } finally {
      bmp.close();
    }

    const { pixels, width: outW, height: outH } = result;
    const canvas = new OffscreenCanvas(outW, outH);
    const ctx = canvas.getContext('2d')!;
    // Uint8ClampedArray.from() yields a fresh ArrayBuffer-backed copy — the
    // array crossing the worker postMessage boundary is typed with a
    // generic ArrayBufferLike that ImageData's constructor rejects.
    ctx.putImageData(new ImageData(Uint8ClampedArray.from(pixels), outW, outH), 0, 0);
    const blob = await canvasToBlob(canvas, 'image/png');

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
    if (targets.length === 0 || strokeCount === 0) return;
    const strokes = strokesRef.current.slice();
    setIsBusy(true);
    setToolBusy(true);
    setFailedCount(0);
    let failed = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        setProgress(`${i + 1}/${targets.length}`);
        try {
          await processItem(targets[i].id, strokes);
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
      runDisabled={targets.length === 0 || strokeCount === 0}
      isBusy={isBusy}
      busyLabel={progress}
    >
      {(tab) => (
        <div className="space-y-4">
          {!selectedImage && (
            <p className="text-sm text-gray-600">{tTools('noImageSelected')}</p>
          )}

          {selectedImage && selectedSrc && (
            <div
              className="relative brutalist-border bg-gray-100 mx-auto touch-none select-none"
              style={{
                width: displaySize?.width,
                height: displaySize?.height,
                maxWidth: '100%',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedSrc}
                alt=""
                className="block w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
              {displaySize && (
                <canvas
                  ref={canvasRef}
                  width={displaySize.width}
                  height={displaySize.height}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endStroke}
                  onPointerLeave={endStroke}
                  onPointerCancel={endStroke}
                />
              )}
            </div>
          )}

          {tab === 'presets' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                {t('brush')}
                <input
                  type="range"
                  min={MIN_BRUSH}
                  max={MAX_BRUSH}
                  step={2}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  disabled={isBusy}
                />
                <span className="font-mono">{brushSize}px</span>
              </label>
              <button
                type="button"
                onClick={clearStrokes}
                disabled={isBusy || strokeCount === 0}
                className="brutalist-border px-3 py-1 text-sm font-bold uppercase bg-white disabled:opacity-40"
              >
                {t('clear')}
              </button>
              <p className="text-sm text-gray-600">{t('hint')}</p>
            </div>
          )}

          {tab === 'advanced' && (
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={applyAllAreas}
                onChange={() => setApplyAllAreas((v) => !v)}
                disabled={isBusy}
                className="mr-2 brutalist-border w-4 h-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black"
                style={{
                  backgroundImage: applyAllAreas
                    ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                    : '',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <span className="font-bold">{t('applyAllAreas')}</span>
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
