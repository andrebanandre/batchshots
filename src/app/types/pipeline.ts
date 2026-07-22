/**
 * Core pipeline data model.
 *
 * A PipelineItem is one uploaded image flowing through the step pipeline.
 * All image payloads are blob object URLs (never base64) so 500-image
 * batches stay memory-bounded. Every step writes its artifacts onto the
 * item via its declared `produces` keys, which also drive downstream
 * invalidation when a step is re-run.
 */

export type StepId =
  | 'upload'
  | 'dedupe'
  | 'bg'
  | 'crop'
  | 'quality'
  | 'ocr'
  | 'caption'
  | 'resize'
  | 'export';

export const STEP_ORDER: StepId[] = [
  'upload',
  'dedupe',
  'bg',
  'crop',
  'quality',
  'ocr',
  'caption',
  'resize',
  'export',
];

export type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  score: number;
}

export interface QualityReport {
  blurVariance: number;
  brightnessMean: number;
  clippedHighlightsPct: number;
  clippedShadowsPct: number;
  resolutionOk: boolean;
  flags: QualityFlag[];
}

export type QualityFlag = 'blurry' | 'dark' | 'overexposed' | 'low-res';

export interface PipelineItem {
  id: string;
  /** Original uploaded file (kept for "keep original" export option) */
  file: File;
  /** Normalized working image (EXIF-rotated, metadata-stripped) */
  blobUrl: string;
  /** ~256px thumbnail — the only URL grids should render */
  thumbUrl: string;
  width: number;
  height: number;

  // ---- per-step artifacts (keys double as invalidation units) ----
  /** 64-bit perceptual hash, hex string (dedupe pass 1) */
  phash?: string;
  /** DNN embedding (dedupe pass 2) */
  embedding?: Float32Array;
  /** id of the kept "best" item this one duplicates, or null if unique/best */
  duplicateOf?: string | null;
  /** bg-removed result (transparent PNG or white composite) */
  cutoutBlobUrl?: string;
  /** best product detection */
  bbox?: BBox;
  /** cropped/squared result */
  croppedBlobUrl?: string;
  quality?: QualityReport;
  ocrText?: string;
  dominantColor?: string;
  classLabel?: string;
  caption?: string;
  seoName?: string;
  /** resized/compressed output of the resize step */
  finalBlobUrl?: string;

  /** excluded items are carried along but not processed/exported */
  excluded: boolean;
  /** per-item status of the step currently processing it */
  error?: string;
}

/** Keys a step may write; used for downstream invalidation. */
export type ArtifactKey = keyof Pick<
  PipelineItem,
  | 'phash'
  | 'embedding'
  | 'duplicateOf'
  | 'cutoutBlobUrl'
  | 'bbox'
  | 'croppedBlobUrl'
  | 'quality'
  | 'ocrText'
  | 'dominantColor'
  | 'classLabel'
  | 'caption'
  | 'seoName'
  | 'finalBlobUrl'
>;

/** The working image for a step = the latest artifact produced upstream. */
export function currentImageUrl(item: PipelineItem): string {
  return (
    item.finalBlobUrl ??
    item.croppedBlobUrl ??
    item.cutoutBlobUrl ??
    item.blobUrl
  );
}

/** Revoke every object URL an item owns. Call before dropping/replacing items. */
export function revokeItem(item: PipelineItem): void {
  for (const url of [
    item.blobUrl,
    item.thumbUrl,
    item.cutoutBlobUrl,
    item.croppedBlobUrl,
    item.finalBlobUrl,
  ]) {
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* already revoked */
      }
    }
  }
}

/** Revoke only the artifact URLs listed (used on invalidation). */
export function revokeArtifacts(item: PipelineItem, keys: ArtifactKey[]): void {
  const urlKeys: ArtifactKey[] = ['cutoutBlobUrl', 'croppedBlobUrl', 'finalBlobUrl'];
  for (const key of keys) {
    if (urlKeys.includes(key)) {
      const url = item[key] as string | undefined;
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* already revoked */
        }
      }
    }
  }
}
