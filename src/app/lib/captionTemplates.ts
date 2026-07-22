export interface CaptionInputs {
  classLabel?: string;
  detectLabel?: string;
  ocrText?: string;
  colorKey?: string;
}

export interface CaptionDict {
  template: string;
  colors: Record<string, string>;
  fallbackLabel: string;
}

const OCR_TOKEN_MIN = 3;
const OCR_TOKEN_MAX = 20;
const SEO_NAME_MAX_LEN = 60;

/** Strip an ImageNet-style comma suffix, e.g. "running shoe, sneaker" -> "running shoe". */
function stripImagenetSuffix(label: string): string {
  const commaIndex = label.indexOf(',');
  return commaIndex === -1 ? label.trim() : label.slice(0, commaIndex).trim();
}

/** Find the first OCR token that looks like a brand: 3-20 chars, starts uppercase, not numeric. */
function pickBrandToken(ocrText?: string): string {
  if (!ocrText) return '';
  const tokens = ocrText.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.length < OCR_TOKEN_MIN || token.length > OCR_TOKEN_MAX) continue;
    if (/^\d+$/.test(token)) continue;
    if (!/^[A-Z]/.test(token)) continue;
    return token;
  }
  return '';
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Fill a caption template with slot values derived from detection/OCR inputs. */
export function buildCaption(inputs: CaptionInputs, dict: CaptionDict): string {
  const rawLabel = inputs.classLabel ?? inputs.detectLabel ?? dict.fallbackLabel;
  const label = stripImagenetSuffix(rawLabel);

  const color = (inputs.colorKey && dict.colors[inputs.colorKey]) || '';

  const brandToken = pickBrandToken(inputs.ocrText);
  const ocrHint = brandToken ? ` ${brandToken}` : '';

  const filled = dict.template
    .replace('{color}', color)
    .replace('{label}', label)
    .replace('{ocrHint}', ocrHint);

  const collapsed = filled.replace(/\s+/g, ' ').trim();
  return capitalizeFirst(collapsed);
}

/**
 * Minimal slugify: lowercase, strip diacritics, replace runs of
 * non-alphanumeric characters with a single hyphen, trim edge hyphens.
 *
 * NOTE: the `slug` npm package is ESM-only (no CJS build) and this repo's
 * jest config (which we're not allowed to modify) can't parse ESM
 * dependencies from node_modules, so importing it breaks every test suite
 * that touches this file. This local implementation covers the same
 * common case (ascii captions) without that dependency.
 */
function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Derive an SEO-friendly, indexed slug from a caption. */
export function buildSeoName(caption: string, index: number): string {
  const base = slugify(caption).slice(0, SEO_NAME_MAX_LEN);
  return `${base}-${index + 1}`;
}
