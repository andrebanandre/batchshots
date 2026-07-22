import { defaultQualityThresholds, evaluateQuality, QualityMetrics } from './qualityRules';

const cleanMetrics: QualityMetrics = {
  blurVariance: 500,
  brightnessMean: 130,
  clippedShadowsPct: 2,
  clippedHighlightsPct: 2,
  width: 1200,
  height: 1600,
};

describe('evaluateQuality', () => {
  it('flags nothing for a clean image', () => {
    const report = evaluateQuality(cleanMetrics);
    expect(report.flags).toEqual([]);
    expect(report.resolutionOk).toBe(true);
  });

  it('flags blurry when blurVariance is below threshold', () => {
    const report = evaluateQuality({ ...cleanMetrics, blurVariance: 50 });
    expect(report.flags).toContain('blurry');
  });

  it('flags dark when brightnessMean is too low', () => {
    const report = evaluateQuality({ ...cleanMetrics, brightnessMean: 30 });
    expect(report.flags).toContain('dark');
  });

  it('flags dark when clippedShadowsPct exceeds max', () => {
    const report = evaluateQuality({ ...cleanMetrics, clippedShadowsPct: 20 });
    expect(report.flags).toContain('dark');
  });

  it('flags overexposed when brightnessMean is too high', () => {
    const report = evaluateQuality({ ...cleanMetrics, brightnessMean: 220 });
    expect(report.flags).toContain('overexposed');
  });

  it('flags overexposed when clippedHighlightsPct exceeds max', () => {
    const report = evaluateQuality({ ...cleanMetrics, clippedHighlightsPct: 20 });
    expect(report.flags).toContain('overexposed');
  });

  it('flags low-res when the long side is below minLongSide', () => {
    const report = evaluateQuality({ ...cleanMetrics, width: 600, height: 400 });
    expect(report.flags).toContain('low-res');
    expect(report.resolutionOk).toBe(false);
  });

  it('respects boundary values (exactly at threshold is ok)', () => {
    const report = evaluateQuality({
      ...cleanMetrics,
      blurVariance: defaultQualityThresholds.minBlurVariance,
      brightnessMean: defaultQualityThresholds.minBrightness,
      clippedShadowsPct: defaultQualityThresholds.maxClippedPct,
      clippedHighlightsPct: defaultQualityThresholds.maxClippedPct,
      width: defaultQualityThresholds.minLongSide,
      height: 100,
    });
    expect(report.flags).toEqual([]);
    expect(report.resolutionOk).toBe(true);
  });

  it('just below boundary triggers flags', () => {
    const report = evaluateQuality({
      ...cleanMetrics,
      blurVariance: defaultQualityThresholds.minBlurVariance - 1,
      width: defaultQualityThresholds.minLongSide - 1,
      height: 100,
    });
    expect(report.flags).toContain('blurry');
    expect(report.flags).toContain('low-res');
  });

  it('supports custom thresholds', () => {
    const custom = { ...defaultQualityThresholds, minBlurVariance: 1000 };
    const report = evaluateQuality(cleanMetrics, custom);
    expect(report.flags).toContain('blurry');
  });
});
