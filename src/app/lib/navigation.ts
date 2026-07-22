/**
 * Data-driven navigation: single source for Navbar + MobileMenu.
 * Tool entries derive from the step registry so adding a step
 * automatically surfaces it in both menus.
 */

import { STEP_ORDER } from '../types/pipeline';
import { STEPS } from './steps/registry';

export interface NavEntry {
  href: string;
  /** Key inside the "Navbar" i18n namespace */
  labelKey: string;
}

/** Primary links shown at top level (desktop) / top of mobile menu. */
export const PRIMARY_NAV: NavEntry[] = [
  { href: '/', labelKey: 'imageOptimizer' },
];

const STEP_LABEL_KEYS: Record<string, string> = {
  '/ai-photo-duplicate-finder': 'aiPhotoDuplicateFinder',
  '/background-removal': 'removeBackgrounds',
  '/product-photo-cropper': 'productPhotoCropper',
  '/image-text-extraction': 'imageTextExtraction',
  '/ai-image-seo-caption-generation': 'aiImageSeoCaptionGeneration',
  '/image-format-convertor': 'imageFormatConvertor',
  '/add-watermark': 'addWatermark',
};

/**
 * Standalone tool routes with no corresponding pipeline StepId — appended
 * after the step-registry-derived entries.
 */
export const EXTRA_TOOLS: NavEntry[] = [
  { href: '/photo-colorizer', labelKey: 'photoColorizer' },
  { href: '/object-removal', labelKey: 'objectRemoval' },
];

/** Tool dropdown entries — every step with a standalone route, in pipeline order. */
export const TOOL_NAV: NavEntry[] = [
  ...STEP_ORDER.flatMap((id) => {
    const route = STEPS[id].route;
    if (!route || !STEP_LABEL_KEYS[route]) return [];
    return [{ href: route, labelKey: STEP_LABEL_KEYS[route] }];
  }),
  ...EXTRA_TOOLS,
];
