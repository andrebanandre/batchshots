'use client';

/**
 * Interactive manual crop overlay for the homepage editor's main preview.
 * Pure canvas/DOM math — no DNN, no worker. Renders a draggable + resizable
 * (8-handle) crop rectangle over the currently displayed image, dims the
 * outside area, and exposes aspect-ratio presets + apply/cancel actions.
 *
 * The overlay is purely presentational/geometric: it reports the crop
 * rectangle as fractions (0..1) of the *displayed* image's natural size via
 * `onRectChange`, and defers actually cropping pixels to the caller
 * (ImagePreview.tsx), which knows how to source/update each ImageFile.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface CropRect {
  /** Fractions of the natural image width/height, each in [0, 1]. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CropAspectKey = 'free' | '1:1' | '4:3' | '16:9';

const ASPECT_VALUES: Record<CropAspectKey, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

interface DisplayedImageRect {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/** Replicates CSS `object-fit: contain` geometry within a container. */
function computeImageRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number
): DisplayedImageRect {
  if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }
  const containerAspect = containerW / containerH;
  const imageAspect = naturalW / naturalH;
  if (imageAspect > containerAspect) {
    const width = containerW;
    const height = containerW / imageAspect;
    return { width, height, offsetX: 0, offsetY: (containerH - height) / 2 };
  }
  const height = containerH;
  const width = containerH * imageAspect;
  return { width, height, offsetX: (containerW - width) / 2, offsetY: 0 };
}

const MIN_SIZE_PX = 24;

type HandleMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const RESIZE_HANDLES: HandleMode[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Computes the next pixel-space crop rect for a drag, honoring aspect lock. */
function resizeRect(
  mode: HandleMode,
  start: PixelRect,
  dx: number,
  dy: number,
  bounds: { width: number; height: number },
  aspectRatio: number | null
): PixelRect {
  if (mode === 'move') {
    return {
      x: clamp(start.x + dx, 0, Math.max(0, bounds.width - start.w)),
      y: clamp(start.y + dy, 0, Math.max(0, bounds.height - start.h)),
      w: start.w,
      h: start.h,
    };
  }

  const hasLeft = mode.includes('w');
  const hasRight = mode.includes('e');
  const hasTop = mode.includes('n');
  const hasBottom = mode.includes('s');

  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;

  if (hasLeft) left = clamp(left + dx, 0, right - MIN_SIZE_PX);
  if (hasRight) right = clamp(right + dx, left + MIN_SIZE_PX, bounds.width);
  if (hasTop) top = clamp(top + dy, 0, bottom - MIN_SIZE_PX);
  if (hasBottom) bottom = clamp(bottom + dy, top + MIN_SIZE_PX, bounds.height);

  if (aspectRatio) {
    const isCorner = (hasLeft || hasRight) && (hasTop || hasBottom);
    const isVerticalEdge = (hasTop || hasBottom) && !hasLeft && !hasRight;
    const isHorizontalEdge = (hasLeft || hasRight) && !hasTop && !hasBottom;

    if (isCorner) {
      const newW = right - left;
      const newH = newW / aspectRatio;
      if (hasTop) top = bottom - newH;
      else bottom = top + newH;
    } else if (isVerticalEdge) {
      const newH = bottom - top;
      const newW = newH * aspectRatio;
      const cx = (left + right) / 2;
      left = cx - newW / 2;
      right = cx + newW / 2;
    } else if (isHorizontalEdge) {
      const newW = right - left;
      const newH = newW / aspectRatio;
      const cy = (top + bottom) / 2;
      top = cy - newH / 2;
      bottom = cy + newH / 2;
    }
  }

  // Re-clamp into bounds, preserving size by shifting the offending edge.
  if (left < 0) {
    right -= left;
    left = 0;
  }
  if (top < 0) {
    bottom -= top;
    top = 0;
  }
  if (right > bounds.width) {
    left -= right - bounds.width;
    right = bounds.width;
  }
  if (bottom > bounds.height) {
    top -= bottom - bounds.height;
    bottom = bounds.height;
  }
  left = clamp(left, 0, Math.max(0, bounds.width - MIN_SIZE_PX));
  top = clamp(top, 0, Math.max(0, bounds.height - MIN_SIZE_PX));
  right = clamp(right, left + MIN_SIZE_PX, bounds.width);
  bottom = clamp(bottom, top + MIN_SIZE_PX, bounds.height);

  return { x: left, y: top, w: right - left, h: bottom - top };
}

function cursorForMode(mode: HandleMode): string {
  switch (mode) {
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'nw':
    case 'se':
      return 'nwse-resize';
    default:
      return 'move';
  }
}

function handleStyle(mode: HandleMode): React.CSSProperties {
  const base: React.CSSProperties = { cursor: cursorForMode(mode), position: 'absolute' };
  switch (mode) {
    case 'nw':
      return { ...base, left: -6, top: -6 };
    case 'n':
      return { ...base, left: '50%', top: -6, transform: 'translateX(-50%)' };
    case 'ne':
      return { ...base, right: -6, top: -6 };
    case 'e':
      return { ...base, right: -6, top: '50%', transform: 'translateY(-50%)' };
    case 'se':
      return { ...base, right: -6, bottom: -6 };
    case 's':
      return { ...base, left: '50%', bottom: -6, transform: 'translateX(-50%)' };
    case 'sw':
      return { ...base, left: -6, bottom: -6 };
    case 'w':
      return { ...base, left: -6, top: '50%', transform: 'translateY(-50%)' };
    default:
      return base;
  }
}

export interface CropOverlayProps {
  /** Container the overlay is absolutely positioned within (image's parent). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  naturalWidth: number;
  naturalHeight: number;
  rect: CropRect;
  onRectChange: (rect: CropRect) => void;
  aspect: CropAspectKey;
  onAspectChange: (aspect: CropAspectKey) => void;
  onApply: () => void;
  onApplyAll: () => void;
  onCancel: () => void;
  applyDisabled?: boolean;
}

export default function CropOverlay({
  containerRef,
  naturalWidth,
  naturalHeight,
  rect,
  onRectChange,
  aspect,
  onAspectChange,
  onApply,
  onApplyAll,
  onCancel,
  applyDisabled = false,
}: CropOverlayProps) {
  const t = useTranslations('Components.ImagePreview');
  const [imageRect, setImageRect] = useState<DisplayedImageRect>({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const dragRef = useRef<{
    mode: HandleMode;
    startClientX: number;
    startClientY: number;
    startPixelRect: PixelRect;
    bounds: { width: number; height: number };
  } | null>(null);

  // Track the container's rendered size so overlay geometry stays in sync
  // with the actual `object-contain` box (letterboxing included).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      setImageRect(
        computeImageRect(container.clientWidth, container.clientHeight, naturalWidth, naturalHeight)
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, naturalWidth, naturalHeight]);

  const pixelRect: PixelRect = {
    x: rect.x * imageRect.width,
    y: rect.y * imageRect.height,
    w: rect.w * imageRect.width,
    h: rect.h * imageRect.height,
  };

  const startDrag = useCallback(
    (mode: HandleMode) => (e: React.PointerEvent) => {
      if (imageRect.width <= 0 || imageRect.height <= 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        mode,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPixelRect: { ...pixelRect },
        bounds: { width: imageRect.width, height: imageRect.height },
      };
    },
    [imageRect, pixelRect]
  );

  useEffect(() => {
    const aspectRatio = ASPECT_VALUES[aspect];

    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.bounds.width <= 0 || drag.bounds.height <= 0) return;
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const next = resizeRect(drag.mode, drag.startPixelRect, dx, dy, drag.bounds, aspectRatio);
      onRectChange({
        x: next.x / drag.bounds.width,
        y: next.y / drag.bounds.height,
        w: next.w / drag.bounds.width,
        h: next.h / drag.bounds.height,
      });
    };
    const handlePointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [aspect, onRectChange]);

  const handleAspectChange = (key: CropAspectKey) => {
    onAspectChange(key);
    const ratio = ASPECT_VALUES[key];
    if (!ratio || imageRect.width <= 0 || imageRect.height <= 0) return;

    // Re-fit the current rect to the new aspect, keeping its center fixed.
    const cx = pixelRect.x + pixelRect.w / 2;
    const cy = pixelRect.y + pixelRect.h / 2;
    let w = pixelRect.w;
    let h = w / ratio;
    if (h > imageRect.height) {
      h = imageRect.height;
      w = h * ratio;
    }
    if (w > imageRect.width) {
      w = imageRect.width;
      h = w / ratio;
    }
    const x = clamp(cx - w / 2, 0, Math.max(0, imageRect.width - w));
    const y = clamp(cy - h / 2, 0, Math.max(0, imageRect.height - h));
    onRectChange({
      x: x / imageRect.width,
      y: y / imageRect.height,
      w: w / imageRect.width,
      h: h / imageRect.height,
    });
  };

  if (imageRect.width <= 0 || imageRect.height <= 0) return null;

  const boxLeft = imageRect.offsetX + pixelRect.x;
  const boxTop = imageRect.offsetY + pixelRect.y;

  return (
    <div className="absolute inset-0 z-20 select-none" style={{ touchAction: 'none' }}>
      {/* Dim mask: four rectangles surrounding the crop box */}
      <div
        className="absolute bg-black/60"
        style={{
          left: imageRect.offsetX,
          top: imageRect.offsetY,
          width: imageRect.width,
          height: pixelRect.y,
        }}
      />
      <div
        className="absolute bg-black/60"
        style={{
          left: imageRect.offsetX,
          top: imageRect.offsetY + pixelRect.y + pixelRect.h,
          width: imageRect.width,
          height: Math.max(0, imageRect.height - pixelRect.y - pixelRect.h),
        }}
      />
      <div
        className="absolute bg-black/60"
        style={{
          left: imageRect.offsetX,
          top: imageRect.offsetY + pixelRect.y,
          width: pixelRect.x,
          height: pixelRect.h,
        }}
      />
      <div
        className="absolute bg-black/60"
        style={{
          left: imageRect.offsetX + pixelRect.x + pixelRect.w,
          top: imageRect.offsetY + pixelRect.y,
          width: Math.max(0, imageRect.width - pixelRect.x - pixelRect.w),
          height: pixelRect.h,
        }}
      />

      {/* Crop rectangle */}
      <div
        className="absolute border-2 border-primary cursor-move"
        style={{ left: boxLeft, top: boxTop, width: pixelRect.w, height: pixelRect.h }}
        onPointerDown={startDrag('move')}
      >
        {RESIZE_HANDLES.map((mode) => (
          <div
            key={mode}
            onPointerDown={startDrag(mode)}
            className="w-3 h-3 bg-primary border-2 border-black"
            style={handleStyle(mode)}
          />
        ))}
      </div>

      {/* Aspect ratio presets */}
      <div className="absolute top-2 left-2 flex gap-1 pointer-events-auto flex-wrap">
        {(['free', '1:1', '4:3', '16:9'] as CropAspectKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleAspectChange(key)}
            className={`brutalist-border border-2 text-xs font-bold px-2 py-1 shadow-brutalist hover:translate-y-[-2px] transition-transform ${
              aspect === key ? 'bg-primary text-white' : 'bg-white text-black'
            }`}
          >
            {key === 'free' ? t('cropAspectFree') : key}
          </button>
        ))}
      </div>

      {/* Apply / cancel controls */}
      <div className="absolute bottom-2 left-2 flex gap-2 pointer-events-auto flex-wrap">
        <button
          type="button"
          onClick={onApply}
          disabled={applyDisabled}
          className="brutalist-border border-2 bg-primary text-white text-xs font-bold px-3 py-1 shadow-brutalist hover:translate-y-[-2px] transition-transform disabled:opacity-50"
        >
          {t('cropApply')}
        </button>
        <button
          type="button"
          onClick={onApplyAll}
          disabled={applyDisabled}
          className="brutalist-border border-2 bg-accent text-black text-xs font-bold px-3 py-1 shadow-brutalist hover:translate-y-[-2px] transition-transform disabled:opacity-50"
        >
          {t('cropApplyAll')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="brutalist-border border-2 bg-white text-black text-xs font-bold px-3 py-1 shadow-brutalist hover:translate-y-[-2px] transition-transform"
        >
          {t('cropCancel')}
        </button>
      </div>
    </div>
  );
}
