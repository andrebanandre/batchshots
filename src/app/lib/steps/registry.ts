/**
 * Step registry — pure metadata, safe to import from server components
 * (nav, layouts). Panels and engines are client-side and are mapped to
 * step ids in src/app/components/steps/index.ts to keep this file free
 * of React/worker imports.
 */

import type { ArtifactKey, StepId } from '../../types/pipeline';

export interface StepMeta {
  id: StepId;
  /** Standalone tool route (locale-relative), null if pipeline-only */
  route: string | null;
  /** next-intl namespace for this step's UI strings */
  i18nNamespace: string;
  /** Whether the pipeline allows skipping this step */
  canSkip: boolean;
  /** Skipped by default when running the full pipeline */
  skippedByDefault?: boolean;
  /** Artifact keys this step writes — drives downstream invalidation */
  produces: ArtifactKey[];
  /** Which DNN models the step needs preloaded (informational) */
  models?: string[];
}

export const STEPS: Record<StepId, StepMeta> = {
  upload: {
    id: 'upload',
    route: null,
    i18nNamespace: 'Pipeline',
    canSkip: false,
    produces: [],
  },
  dedupe: {
    id: 'dedupe',
    route: '/ai-photo-duplicate-finder',
    i18nNamespace: 'ImageDuplicateDetectionPage',
    canSkip: true,
    produces: ['phash', 'embedding', 'duplicateOf'],
    models: ['dinov2-small.onnx'],
  },
  bg: {
    id: 'bg',
    route: '/background-removal',
    i18nNamespace: 'BackgroundRemovalPage',
    canSkip: true,
    produces: ['cutoutBlobUrl'],
    models: ['u2netp.onnx', 'u2net.onnx'],
  },
  crop: {
    id: 'crop',
    route: '/product-photo-cropper',
    i18nNamespace: 'CropStep',
    canSkip: true,
    produces: ['bbox', 'croppedBlobUrl'],
    models: ['yolov8n.onnx'],
  },
  quality: {
    id: 'quality',
    route: '/photo-quality-checker',
    i18nNamespace: 'QualityStep',
    canSkip: true,
    produces: ['quality'],
  },
  ocr: {
    id: 'ocr',
    route: '/image-text-extraction',
    i18nNamespace: 'OcrStep',
    canSkip: true,
    skippedByDefault: true,
    produces: ['ocrText'],
    models: ['ppocr-det.onnx', 'ppocr-rec.onnx'],
  },
  caption: {
    id: 'caption',
    route: '/ai-image-seo-caption-generation',
    i18nNamespace: 'ImageSeoGenerationPage',
    canSkip: true,
    produces: ['classLabel', 'dominantColor', 'caption', 'seoName'],
    models: ['mobilenetv2.onnx'],
  },
  resize: {
    id: 'resize',
    route: '/image-format-convertor',
    i18nNamespace: 'ResizeStep',
    canSkip: true,
    produces: ['finalBlobUrl'],
  },
  export: {
    id: 'export',
    route: '/add-watermark',
    i18nNamespace: 'ExportStep',
    canSkip: false,
    produces: [],
  },
};

export function stepMeta(id: StepId): StepMeta {
  return STEPS[id];
}
