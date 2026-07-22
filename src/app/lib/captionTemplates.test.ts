import { buildCaption, buildSeoName, CaptionDict } from './captionTemplates';

const dict: CaptionDict = {
  template: '{color} {label}{ocrHint}',
  colors: { red: 'red', blue: 'blue' },
  fallbackLabel: 'product',
};

describe('buildCaption', () => {
  it('fills all slots when inputs are complete', () => {
    const caption = buildCaption(
      { classLabel: 'running shoe', colorKey: 'red', ocrText: 'Nike air max' },
      dict
    );
    expect(caption).toBe('Red running shoe Nike');
  });

  it('omits color slot gracefully when missing', () => {
    const caption = buildCaption({ classLabel: 'backpack' }, dict);
    expect(caption).toBe('Backpack');
  });

  it('falls back to fallbackLabel when classLabel/detectLabel are missing', () => {
    const caption = buildCaption({}, dict);
    expect(caption).toBe('Product');
  });

  it('prefers classLabel over detectLabel', () => {
    const caption = buildCaption({ classLabel: 'lamp', detectLabel: 'furniture' }, dict);
    expect(caption).toBe('Lamp');
  });

  it('falls back to detectLabel when classLabel is missing', () => {
    const caption = buildCaption({ detectLabel: 'chair' }, dict);
    expect(caption).toBe('Chair');
  });

  it('strips ImageNet comma suffixes', () => {
    const caption = buildCaption({ classLabel: 'running shoe, sneaker' }, dict);
    expect(caption).toBe('Running shoe');
  });

  it('picks the first brand-looking OCR token', () => {
    const caption = buildCaption({ classLabel: 'box', ocrText: 'IKEA 12345 abc' }, dict);
    expect(caption).toBe('Box IKEA');
  });

  it('ignores OCR tokens that are numeric or lowercase-start', () => {
    const caption = buildCaption({ classLabel: 'box', ocrText: '12345 abcdef' }, dict);
    expect(caption).toBe('Box');
  });

  it('ignores OCR tokens outside 3-20 char range', () => {
    const caption = buildCaption({ classLabel: 'box', ocrText: 'Hi Nike' }, dict);
    expect(caption).toBe('Box Nike');
  });

  it('collapses multiple spaces and trims', () => {
    const sparse: CaptionDict = { ...dict, template: '{color}   {label}{ocrHint}   ' };
    const caption = buildCaption({ classLabel: 'bag' }, sparse);
    expect(caption).toBe('Bag');
  });
});

describe('buildSeoName', () => {
  it('produces a slug with a 1-based index suffix', () => {
    expect(buildSeoName('Red running shoe', 0)).toBe('red-running-shoe-1');
    expect(buildSeoName('Red running shoe', 4)).toBe('red-running-shoe-5');
  });

  it('truncates long captions to 60 chars before the suffix', () => {
    const longCaption = 'a'.repeat(100);
    const seoName = buildSeoName(longCaption, 0);
    const [base, suffix] = seoName.split(/-(\d+)$/).filter(Boolean);
    expect(base.length).toBeLessThanOrEqual(60);
    expect(suffix).toBe('1');
  });

  it('produces url-safe lowercase slugs', () => {
    const seoName = buildSeoName('Nike Air Max!! Red/Blue', 2);
    expect(seoName).toMatch(/^[a-z0-9-]+-3$/);
  });
});
