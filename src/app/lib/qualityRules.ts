import { QualityFlag, QualityReport } from '../types/pipeline';

export interface QualityThresholds {
  minBlurVariance: number;
  minBrightness: number;
  maxBrightness: number;
  maxClippedPct: number;
  minLongSide: number;
}

export const defaultQualityThresholds: QualityThresholds = {
  minBlurVariance: 100,
  minBrightness: 60,
  maxBrightness: 200,
  maxClippedPct: 15,
  minLongSide: 800,
};

export interface QualityMetrics {
  blurVariance: number;
  brightnessMean: number;
  clippedShadowsPct: number;
  clippedHighlightsPct: number;
  width: number;
  height: number;
}

/** Evaluate raw image quality metrics against thresholds, producing flags. */
export function evaluateQuality(
  metrics: QualityMetrics,
  t: QualityThresholds = defaultQualityThresholds
): QualityReport {
  const flags: QualityFlag[] = [];

  if (metrics.blurVariance < t.minBlurVariance) {
    flags.push('blurry');
  }

  if (metrics.brightnessMean < t.minBrightness || metrics.clippedShadowsPct > t.maxClippedPct) {
    flags.push('dark');
  }

  if (metrics.brightnessMean > t.maxBrightness || metrics.clippedHighlightsPct > t.maxClippedPct) {
    flags.push('overexposed');
  }

  const longSide = Math.max(metrics.width, metrics.height);
  const resolutionOk = longSide >= t.minLongSide;
  if (!resolutionOk) {
    flags.push('low-res');
  }

  return {
    blurVariance: metrics.blurVariance,
    brightnessMean: metrics.brightnessMean,
    clippedHighlightsPct: metrics.clippedHighlightsPct,
    clippedShadowsPct: metrics.clippedShadowsPct,
    resolutionOk,
    flags,
  };
}
