'use client';

/**
 * Shared access layer between the editor page and the tool section Cards
 * (Duplicates, Background, Auto-Crop, Quality, OCR, SEO Names, Export).
 *
 * Follows the same pass-through pattern as ImageProcessingContext: the
 * page owns the images state; this context distributes it plus targeted
 * update helpers so each Card stays self-contained.
 */

import React, { createContext, ReactNode, useContext } from 'react';
import { ImageFile } from '../components/ImagePreview';
import type { Preset } from '../components/PresetsSelector';

export interface EditorToolsContextValue {
  images: ImageFile[];
  selectedImageId: string | null;
  /** Patch one image by id */
  updateImage: (id: string, patch: Partial<ImageFile>) => void;
  /** Patch many images at once */
  updateImages: (patches: { id: string; patch: Partial<ImageFile> }[]) => void;
  /** Remove images outright (e.g. auto-removed duplicates) */
  removeImages?: (ids: string[]) => void;
  /** Global busy flag (adjustment pipeline or a tool run) */
  isProcessing: boolean;
  setToolBusy: (busy: boolean) => void;
  /**
   * Bake pending adjustments/preset/watermark into full-size results
   * (editor page supplies this; standalone tools may omit it).
   */
  prepareForExport?: () => Promise<ImageFile[]>;
  /**
   * Fully-wired <PresetsSelector/> supplied by the page, rendered inside
   * ExportCard's presets tab (the export flow now owns image-optimization
   * presets instead of a separate sidebar card).
   */
  presetSlot?: ReactNode;
  /** The currently selected preset (width/height/quality), if any. */
  currentPreset?: Preset | null;
}

const EditorToolsContext = createContext<EditorToolsContextValue | undefined>(
  undefined
);

export function useEditorTools(): EditorToolsContextValue {
  const ctx = useContext(EditorToolsContext);
  if (!ctx) {
    throw new Error('useEditorTools must be used within EditorToolsProvider');
  }
  return ctx;
}

/**
 * Which images a tool action targets, honoring the section's
 * "apply to all" toggle and skipping excluded images.
 */
export function targetImages(
  images: ImageFile[],
  selectedImageId: string | null,
  applyToAll: boolean
): ImageFile[] {
  if (applyToAll) return images.filter((i) => !i.excluded);
  const selected = images.find((i) => i.id === selectedImageId);
  return selected ? [selected] : [];
}

/** Source URL for tool processing: latest processed result, else original. */
export function toolSourceUrl(image: ImageFile): string {
  return image.processedDataUrl ?? image.dataUrl ?? '';
}

export function EditorToolsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: EditorToolsContextValue;
}) {
  return (
    <EditorToolsContext.Provider value={value}>
      {children}
    </EditorToolsContext.Provider>
  );
}
