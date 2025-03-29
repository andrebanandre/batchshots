import React from 'react';
import Button from './Button';

export interface Preset {
  id: string;
  name: string;
  width: number;
  height: number | null; // null for maintaining aspect ratio
  quality: number;
  description: string;
}

interface PresetsSelectorProps {
  presets: Preset[];
  selectedPreset: string | null;
  onSelectPreset: (presetId: string) => void;
}

// SEO-friendly presets for product images
export const defaultPresets: Preset[] = [
  {
    id: 'social',
    name: 'Social Media',
    width: 1080,
    height: null,
    quality: 85,
    description: 'Optimized for Instagram, Facebook, and other social platforms'
  },
  {
    id: 'product-listing',
    name: 'Product Listing',
    width: 800,
    height: null,
    quality: 85,
    description: 'Best for product listings on e-commerce websites'
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    width: 300,
    height: 300,
    quality: 80,
    description: 'Square thumbnails for product galleries'
  },
  {
    id: 'full-quality',
    name: 'Full Quality',
    width: 1200,
    height: null,
    quality: 90,
    description: 'High quality for zoom features on product pages'
  }
];

export default function PresetsSelector({ 
  presets, 
  selectedPreset, 
  onSelectPreset 
}: PresetsSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg uppercase">SEO PRESETS</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            variant={selectedPreset === preset.id ? 'accent' : 'primary'}
            className="text-left"
            onClick={() => onSelectPreset(preset.id)}
          >
            <div>
              <div className="font-bold">{preset.name}</div>
              <div className="text-xs">
                {preset.width}x{preset.height || 'auto'} @ {preset.quality}%
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
} 