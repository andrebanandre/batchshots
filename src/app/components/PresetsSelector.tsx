import React, { useState, useEffect } from 'react';
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
  onCustomSettingsChange?: (settings: { width: number; height: number | null; quality: number }) => void;
}

// Size-based and quality-based presets
export const defaultPresets: Preset[] = [
  // Size presets
  {
    id: 'size-small',
    name: '720p',
    width: 720,
    height: null,
    quality: 85,
    description: 'HD resolution (720 pixels on longest side)'
  },
  {
    id: 'size-medium',
    name: '1080p',
    width: 1080,
    height: null,
    quality: 85,
    description: 'Full HD resolution (1080 pixels on longest side)'
  },
  {
    id: 'size-large',
    name: '1440p',
    width: 1440,
    height: null,
    quality: 85,
    description: 'Quad HD resolution (1440 pixels on longest side)'
  },
  {
    id: 'size-xlarge',
    name: '2160p (4K)',
    width: 2160,
    height: null,
    quality: 85,
    description: '4K resolution (2160 pixels on longest side)'
  },
  // Quality presets
  {
    id: 'quality-web',
    name: 'Web Optimized',
    width: 1080,
    height: null,
    quality: 75,
    description: 'Smallest file size, good for web (75% quality)'
  },
  {
    id: 'quality-standard',
    name: 'Standard',
    width: 1080,
    height: null,
    quality: 85,
    description: 'Balanced file size and quality (85% quality)'
  },
  {
    id: 'quality-high',
    name: 'High Quality',
    width: 1080,
    height: null,
    quality: 95,
    description: 'High quality with larger file size (95% quality)'
  },
  {
    id: 'quality-max',
    name: 'Maximum',
    width: 1080,
    height: null,
    quality: 100,
    description: 'Maximum quality with largest file size (100% quality)'
  },
  // Custom preset (will be filled by Advanced tab)
  {
    id: 'custom',
    name: 'Custom',
    width: 1080,
    height: null,
    quality: 85,
    description: 'Custom dimensions and quality settings'
  }
];

export default function PresetsSelector({ 
  presets, 
  selectedPreset, 
  onSelectPreset,
  onCustomSettingsChange
}: PresetsSelectorProps) {
  const [activeTab, setActiveTab] = useState<'size' | 'quality' | 'advanced'>('size');
  
  // Get the selected preset details
  const selectedPresetDetails = selectedPreset 
    ? presets.find(p => p.id === selectedPreset) 
    : null;
  
  // State for advanced tab custom settings
  const [customWidth, setCustomWidth] = useState('1080');
  const [customHeight, setCustomHeight] = useState('');
  const [customQuality, setCustomQuality] = useState('85');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  // Update custom settings when a preset is selected
  useEffect(() => {
    if (selectedPresetDetails) {
      setCustomWidth(selectedPresetDetails.width.toString());
      setCustomHeight(selectedPresetDetails.height?.toString() || '');
      setCustomQuality(selectedPresetDetails.quality.toString());
      setMaintainAspectRatio(selectedPresetDetails.height === null);
    }
  }, [selectedPresetDetails]);

  // Apply custom settings
  const handleApplyCustomSettings = () => {
    // Find and update the custom preset
    const customPreset = presets.find(p => p.id === 'custom');
    if (customPreset && onCustomSettingsChange) {
      const settings = {
        width: parseInt(customWidth) || 1080,
        height: maintainAspectRatio ? null : (parseInt(customHeight) || null),
        quality: parseInt(customQuality) || 85
      };
      
      onCustomSettingsChange(settings);
      
      // Select the custom preset
      onSelectPreset('custom');
    }
  };
  
  // Filter presets based on the active tab
  const filteredPresets = presets.filter(preset => {
    if (activeTab === 'size') return preset.id.startsWith('size-');
    if (activeTab === 'quality') return preset.id.startsWith('quality-');
    return false; // For advanced tab, we'll handle differently
  });

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex border-b border-black">
        <button 
          className={`px-4 py-2 font-bold text-sm ${activeTab === 'size' ? 'bg-primary text-white' : 'bg-white'}`}
          onClick={() => setActiveTab('size')}
        >
          SIZE
        </button>
        <button 
          className={`px-4 py-2 font-bold text-sm ${activeTab === 'quality' ? 'bg-primary text-white' : 'bg-white'}`}
          onClick={() => setActiveTab('quality')}
        >
          QUALITY
        </button>
        <button 
          className={`px-4 py-2 font-bold text-sm ${activeTab === 'advanced' ? 'bg-primary text-white' : 'bg-white'}`}
          onClick={() => setActiveTab('advanced')}
        >
          ADVANCED
        </button>
      </div>
      
      {/* Size and Quality Presets */}
      {(activeTab === 'size' || activeTab === 'quality') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredPresets.map((preset) => (
            <Button
              key={preset.id}
              variant={selectedPreset === preset.id ? 'accent' : 'primary'}
              className="text-left"
              onClick={() => onSelectPreset(preset.id)}
            >
              <div>
                <div className="font-bold">{preset.name}</div>
                <div className="text-xs">
                  {activeTab === 'size' 
                    ? `${preset.width}px (longest side)` 
                    : `${preset.quality}% quality`}
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}
      
      {/* Advanced Tab Content */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="brutalist-border p-3">
            <div className="mb-3">
              <label className="block font-bold text-sm mb-1">WIDTH (px)</label>
              <input
                type="number"
                min="1"
                max="10000"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                className="w-full border-2 border-black p-2"
              />
            </div>
            
            <div className="mb-3">
              <div className="flex items-center">
                <label className="block font-bold text-sm mb-1 flex-1">HEIGHT (px)</label>
                <div className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    id="aspect-ratio"
                    checked={maintainAspectRatio}
                    onChange={() => setMaintainAspectRatio(!maintainAspectRatio)}
                    className="mr-1 h-4 w-4"
                  />
                  <label htmlFor="aspect-ratio" className="text-xs">Keep aspect ratio</label>
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="10000"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                disabled={maintainAspectRatio}
                className={`w-full border-2 border-black p-2 ${maintainAspectRatio ? 'opacity-50' : ''}`}
                placeholder={maintainAspectRatio ? "Calculated automatically" : "Enter height"}
              />
            </div>
            
            <div className="mb-3">
              <label className="block font-bold text-sm mb-1">QUALITY (%)</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={customQuality}
                  onChange={(e) => setCustomQuality(e.target.value)}
                  className="flex-1 mr-2"
                />
                <span className="text-sm font-bold">{customQuality}%</span>
              </div>
            </div>
            
            <div className="mt-4">
              <Button
                variant="accent"
                fullWidth
                onClick={handleApplyCustomSettings}
              >
                APPLY CUSTOM SETTINGS
              </Button>
            </div>
          </div>
          
          {/* Info about custom settings */}
          <div className="text-xs text-gray-600 p-2">
            <div className="font-bold mb-1">Currently Applied:</div>
            {selectedPresetDetails ? (
              <div>
                <div>Preset: {selectedPresetDetails.name}</div>
                <div>Dimensions: {selectedPresetDetails.width}x{selectedPresetDetails.height || 'auto'}</div>
                <div>Quality: {selectedPresetDetails.quality}%</div>
              </div>
            ) : (
              <div>No preset selected</div>
            )}
          </div>
        </div>
      )}
      
      {/* Currently selected preset info */}
      {selectedPresetDetails && (activeTab === 'size' || activeTab === 'quality') && (
        <div className="text-xs mt-2 p-2 brutalist-border bg-slate-50">
          <div className="font-bold">Currently Selected:</div>
          <div>{selectedPresetDetails.name} - {selectedPresetDetails.description}</div>
          <div>Dimensions: {selectedPresetDetails.width}x{selectedPresetDetails.height || 'auto'} @ {selectedPresetDetails.quality}%</div>
        </div>
      )}
    </div>
  );
} 