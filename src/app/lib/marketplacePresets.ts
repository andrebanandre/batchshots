/** Marketplace-ready output presets for the resize/compress step. */

export interface MarketplacePreset {
  id: string;
  name: string;
  width: number;
  height: number | null;
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
  padToExact: boolean;
  background: string;
}

export const CUSTOM_PRESET_ID = 'custom';

export const MARKETPLACE_PRESETS: MarketplacePreset[] = [
  {
    id: 'amazon',
    name: 'Amazon (2000×2000 JPEG)',
    width: 2000,
    height: 2000,
    format: 'jpeg',
    quality: 0.9,
    padToExact: true,
    background: '#ffffff',
  },
  {
    id: 'ebay',
    name: 'eBay (1600px longest side)',
    width: 1600,
    height: null,
    format: 'jpeg',
    quality: 0.9,
    padToExact: false,
    background: '#ffffff',
  },
  {
    id: 'etsy',
    name: 'Etsy (3000×2250 JPEG)',
    width: 3000,
    height: 2250,
    format: 'jpeg',
    quality: 0.9,
    padToExact: false,
    background: '#ffffff',
  },
  {
    id: 'shopify',
    name: 'Shopify (2048×2048)',
    width: 2048,
    height: 2048,
    format: 'jpeg',
    quality: 0.9,
    padToExact: true,
    background: '#ffffff',
  },
  {
    id: 'instagram',
    name: 'Instagram (1080×1080)',
    width: 1080,
    height: 1080,
    format: 'jpeg',
    quality: 0.9,
    padToExact: true,
    background: '#ffffff',
  },
  {
    id: 'web',
    name: 'Web (1200px WEBP)',
    width: 1200,
    height: null,
    format: 'webp',
    quality: 0.85,
    padToExact: false,
    background: '#ffffff',
  },
];
