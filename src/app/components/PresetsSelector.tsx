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

// Combined size and quality presets
export const defaultPresets: Preset[] = [
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    width: 1080,
    height: null,
    quality: 75,
    description: '1080px, 75% quality (Smallest file size, good for web)'
  },
  {
    id: 'standard',
    name: 'Standard',
    width: 1080,
    height: null,
    quality: 85,
    description: '1080px, 85% quality (Balanced size and quality)'
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    width: 1440, // Updated width for high quality
    height: null,
    quality: 95,
    description: '1440px, 95% quality (High quality, larger file size)'
  },
  {
    id: 'max-quality',
    name: 'Maximum',
    width: 2160, // Updated width for max quality (4K)
    height: null,
    quality: 100,
    description: '2160px, 100% quality (Maximum quality, largest file size)'
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
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic'); // Default to basic tab
  
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
      // Switch to advanced tab to show custom settings were applied
      setActiveTab('advanced'); 
    }
  };
  
  // Filter presets based on the active tab
  const filteredPresets = presets.filter(preset => {
    if (activeTab === 'basic') return !preset.id.startsWith('custom'); // Show all non-custom presets
    // Advanced tab doesn't show presets list, it shows controls
    return false; 
  });

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex border-b border-black">
        <button 
          className={`px-4 py-2 font-bold text-sm ${activeTab === 'basic' ? 'bg-primary text-white' : 'bg-white'}`}
          onClick={() => setActiveTab('basic')}
        >
          BASIC
        </button>
        {/* Removed Quality Tab Button */}
        <button 
          className={`px-4 py-2 font-bold text-sm ${activeTab === 'advanced' ? 'bg-primary text-white' : 'bg-white'}`}
          onClick={() => setActiveTab('advanced')}
        >
          ADVANCED
        </button>
      </div>
      
      {/* Basic Presets */}
      {activeTab === 'basic' && (
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
                  {/* Display the full description */}
                  {preset.description}
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
                    className="mr-1 h-4 w-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black brutalist-border"
                    style={{
                      backgroundImage: maintainAspectRatio ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")" : "",
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat"
                    }}
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
                  className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-sm font-bold ml-2">{customQuality}%</span>
              </div>
            </div>
            
            <div className="mt-4">
              <Button
                variant="default"
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
      
      {/* Currently selected preset info - Simplified display logic */}
      {selectedPresetDetails && activeTab === 'basic' && (
        <div className="text-xs mt-2 p-2 brutalist-border bg-slate-50">
          <div className="font-bold">Currently Selected:</div>
          <div>{selectedPresetDetails.name} - {selectedPresetDetails.description}</div>
          {/* Removed redundant dimension/quality display here */}
        </div>
      )}
    </div>
  );
} 