import React, { useState } from 'react';
import Button from './Button';
import { useTranslations } from 'next-intl';

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
  showCustomSettings?: boolean;
  liveCustomSettings?: boolean;
}

// Combined size and quality presets
export const defaultPresets: Preset[] = [
  {
    id: 'web-optimized',
    name: 'presets.web-optimized.name',
    width: 1080,
    height: null,
    quality: 75,
    description: 'presets.web-optimized.description'
  },
  {
    id: 'standard',
    name: 'presets.standard.name',
    width: 1080,
    height: null,
    quality: 85,
    description: 'presets.standard.description'
  },
  {
    id: 'high-quality',
    name: 'presets.high-quality.name',
    width: 1440,
    height: null,
    quality: 95,
    description: 'presets.high-quality.description'
  },
  {
    id: 'max-quality',
    name: 'presets.max-quality.name',
    width: 2160,
    height: null,
    quality: 100,
    description: 'presets.max-quality.description'
  },
  // Custom preset (filled by the custom controls when they are shown)
  {
    id: 'custom',
    name: 'presets.custom.name',
    width: 1080,
    height: null,
    quality: 85,
    description: 'presets.custom.description'
  }
];

export default function PresetsSelector({ 
  presets, 
  selectedPreset, 
  onSelectPreset,
  onCustomSettingsChange,
  showCustomSettings = true,
  liveCustomSettings = false,
}: PresetsSelectorProps) {
  const t = useTranslations('Components.PresetsSelector');
  
  // State for custom settings
  const [customWidth, setCustomWidth] = useState('1080');
  const [customHeight, setCustomHeight] = useState('');
  const [customQuality, setCustomQuality] = useState('85');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  const handleSelectPreset = (preset: Preset) => {
    setCustomWidth(preset.width.toString());
    setCustomHeight(preset.height?.toString() || '');
    setCustomQuality(preset.quality.toString());
    setMaintainAspectRatio(preset.height === null);
    onSelectPreset(preset.id);
  };

  const applyCustomSettings = (
    width = customWidth,
    height = customHeight,
    quality = customQuality,
    keepAspectRatio = maintainAspectRatio
  ) => {
    const customPreset = presets.find(p => p.id === 'custom');
    if (customPreset && onCustomSettingsChange) {
      const settings = {
        width: parseInt(width) || 1080,
        height: keepAspectRatio ? null : (parseInt(height) || null),
        quality: parseInt(quality) || 85
      };
      
      onCustomSettingsChange(settings);
      
      // Select the custom preset
      onSelectPreset('custom');
    }
  };

  const simplePresets = presets.filter((preset) => preset.id !== 'custom');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {simplePresets.map((preset) => (
          <Button
            key={preset.id}
            variant={selectedPreset === preset.id ? 'accent' : 'primary'}
            className="text-left"
            onClick={() => handleSelectPreset(preset)}
            aria-pressed={selectedPreset === preset.id}
          >
            <div>
              <div className="font-bold">{t(`presets.${preset.id}.name`)}</div>
              <div className="text-xs">
                {t(`presets.${preset.id}.description`)}
              </div>
            </div>
          </Button>
        ))}
      </div>
      
      {showCustomSettings && onCustomSettingsChange && (
        <div className="brutalist-border p-3 space-y-4">
          <h3 className="font-bold uppercase">{t('custom')}</h3>
          <div className="mb-3">
              <label className="block font-bold text-sm mb-1">{t('dimensions')}</label>
              <div className="flex items-center mb-2">
                <div className="flex-1 mr-2">
                  <label className="block text-xs mb-1">{t('width')}</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={customWidth}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomWidth(value);
                      if (liveCustomSettings) applyCustomSettings(value);
                    }}
                    className="w-full border-2 border-black p-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1">{t('height')}</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={customHeight}
                    disabled={maintainAspectRatio}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomHeight(value);
                      if (liveCustomSettings) {
                        applyCustomSettings(customWidth, value);
                      }
                    }}
                    className={`w-full border-2 border-black p-2 ${maintainAspectRatio ? 'bg-gray-100' : ''}`}
                    placeholder={maintainAspectRatio ? t('auto') : ''}
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="aspect-ratio"
                  checked={maintainAspectRatio}
                  onChange={() => {
                    const value = !maintainAspectRatio;
                    setMaintainAspectRatio(value);
                    if (liveCustomSettings) {
                      applyCustomSettings(
                        customWidth,
                        customHeight,
                        customQuality,
                        value
                      );
                    }
                  }}
                  className="mr-2 h-4 w-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black brutalist-border"
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

          <div className="mb-3">
            <label className="block font-bold text-sm mb-1">{t('quality')}</label>
            <input
              type="range"
              min="10"
              max="100"
              value={customQuality}
              onChange={(e) => {
                const value = e.target.value;
                setCustomQuality(value);
                if (liveCustomSettings) {
                  applyCustomSettings(customWidth, customHeight, value);
                }
              }}
              className="w-full"
            />
            <div className="text-right text-sm">{customQuality}%</div>
          </div>
          {!liveCustomSettings && (
            <Button
              onClick={() => applyCustomSettings()}
              variant={selectedPreset === 'custom' ? 'accent' : 'primary'}
              fullWidth
            >
              {t('apply')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
