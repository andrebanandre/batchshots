import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  redScale: number;
  greenScale: number;
  blueScale: number;
  // New ImageMagick-like adjustments
  sharpen: number;    // For adaptive sharpen 
  autoLevel: boolean; // For auto-level
  autoGamma: boolean; // For auto-gamma
  saturation: number; // For modulate (saturation component)
  hue: number;        // For modulate (hue component)
  lightness: number;  // For modulate (lightness component)
}

export const defaultAdjustments: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  redScale: 1.0,
  greenScale: 1.0,
  blueScale: 1.0,
  sharpen: 0,
  autoLevel: false,
  autoGamma: false,
  saturation: 100,
  hue: 100,
  lightness: 100
};

interface ImageProcessingControlsProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: ImageAdjustments) => void;
  onProcessImages: () => void;
  onReset: () => void;
  onDownload: () => void;
  applyToAll: boolean;
  setApplyToAll: (value: boolean) => void;
  className?: string;
}

export default function ImageProcessingControls({
  adjustments,
  onAdjustmentsChange,
  onProcessImages,
  onReset,
  onDownload,
  applyToAll,
  setApplyToAll,
  className = '',
}: ImageProcessingControlsProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  const handleSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    property: keyof ImageAdjustments
  ) => {
    const value = parseFloat(e.target.value);
    onAdjustmentsChange({
      ...adjustments,
      [property]: value,
    });
  };

  const handleCheckboxChange = (
    property: keyof ImageAdjustments
  ) => {
    onAdjustmentsChange({
      ...adjustments,
      [property]: !adjustments[property as keyof typeof adjustments],
    });
  };

  const handleApplyAllChange = () => {
    setApplyToAll(!applyToAll);
  };

  const handleQuickPreset = (preset: 'auto' | 'vivid' | 'sharp' | 'classic') => {
    let newAdjustments = { ...defaultAdjustments };
    
    switch (preset) {
      case 'auto':
        newAdjustments = {
          ...newAdjustments,
          autoLevel: true,
          autoGamma: true,
          brightness: 20,
          contrast: -10,
          sharpen: 0.8
        };
        break;
      case 'vivid':
        newAdjustments = {
          ...newAdjustments,
          saturation: 120,
          lightness: 110,
          contrast: 10
        };
        break;
      case 'sharp':
        newAdjustments = {
          ...newAdjustments,
          sharpen: 1.5,
          brightness: 10,
          contrast: 15
        };
        break;
      case 'classic':
        newAdjustments = {
          ...newAdjustments,
          redScale: 1.1,
          greenScale: 1.0,
          blueScale: 0.9,
          saturation: 90,
          lightness: 105
        };
        break;
    }
    
    onAdjustmentsChange(newAdjustments);
  };

  return (
    <Card title="IMAGE ADJUSTMENTS" className={className} variant="accent">
      <div className="space-y-6">
        {/* Mode Toggle (Apply to All vs Individual) */}
        <div className="flex justify-between items-center">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={handleApplyAllChange}
              className="mr-2 brutalist-border w-4 h-4"
            />
            <span className="font-bold">APPLY TO ALL IMAGES</span>
          </label>
        </div>

        {/* Tabs for Basic/Advanced Controls */}
        <div className="border-b-2 border-black mb-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-4 font-bold ${activeTab === 'basic' ? 'bg-black text-white' : 'bg-white text-black'}`}
            >
              BASIC
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-2 px-4 font-bold ${activeTab === 'advanced' ? 'bg-black text-white' : 'bg-white text-black'}`}
            >
              ADVANCED
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">QUICK PRESETS</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleQuickPreset('auto')} size="sm">AUTO ENHANCE</Button>
            <Button onClick={() => handleQuickPreset('vivid')} size="sm">VIVID</Button>
            <Button onClick={() => handleQuickPreset('sharp')} size="sm">SHARP</Button>
            <Button onClick={() => handleQuickPreset('classic')} size="sm">CLASSIC</Button>
          </div>
        </div>

        {activeTab === 'basic' ? (
          <>
            {/* Basic Controls */}
            <div className="space-y-4">
              <div>
                <label htmlFor="brightness" className="block mb-1 font-bold">
                  BRIGHTNESS: {adjustments.brightness}
                </label>
                <input
                  id="brightness"
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.brightness}
                  onChange={(e) => handleSliderChange(e, 'brightness')}
                  className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              <div>
                <label htmlFor="contrast" className="block mb-1 font-bold">
                  CONTRAST: {adjustments.contrast}
                </label>
                <input
                  id="contrast"
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.contrast}
                  onChange={(e) => handleSliderChange(e, 'contrast')}
                  className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Checkboxes for auto adjustments */}
              <div className="flex flex-col space-y-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={adjustments.autoLevel}
                    onChange={() => handleCheckboxChange('autoLevel')}
                    className="mr-2 brutalist-border w-4 h-4"
                  />
                  <span>AUTO LEVEL</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={adjustments.autoGamma}
                    onChange={() => handleCheckboxChange('autoGamma')}
                    className="mr-2 brutalist-border w-4 h-4"
                  />
                  <span>AUTO GAMMA</span>
                </label>
              </div>

              <div>
                <label htmlFor="sharpen" className="block mb-1 font-bold">
                  SHARPEN: {adjustments.sharpen.toFixed(1)}
                </label>
                <input
                  id="sharpen"
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={adjustments.sharpen}
                  onChange={(e) => handleSliderChange(e, 'sharpen')}
                  className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Advanced Controls */}
            <div className="space-y-6">
              {/* Modulate (HSL) controls */}
              <div>
                <h3 className="font-bold mb-2">MODULATE (HSL)</h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="lightness" className="block mb-1 text-sm">
                      LIGHTNESS: {adjustments.lightness}%
                    </label>
                    <input
                      id="lightness"
                      type="range"
                      min="50"
                      max="150"
                      value={adjustments.lightness}
                      onChange={(e) => handleSliderChange(e, 'lightness')}
                      className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="saturation" className="block mb-1 text-sm">
                      SATURATION: {adjustments.saturation}%
                    </label>
                    <input
                      id="saturation"
                      type="range"
                      min="0"
                      max="200"
                      value={adjustments.saturation}
                      onChange={(e) => handleSliderChange(e, 'saturation')}
                      className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="hue" className="block mb-1 text-sm">
                      HUE: {adjustments.hue}%
                    </label>
                    <input
                      id="hue"
                      type="range"
                      min="0"
                      max="200"
                      value={adjustments.hue}
                      onChange={(e) => handleSliderChange(e, 'hue')}
                      className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* White Balance controls */}
              <div>
                <h3 className="font-bold mb-2">WHITE BALANCE</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="redScale" className="block mb-1 text-sm">
                      RED: {adjustments.redScale.toFixed(1)}
                    </label>
                    <input
                      id="redScale"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={adjustments.redScale}
                      onChange={(e) => handleSliderChange(e, 'redScale')}
                      className="w-full brutalist-border p-1 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="greenScale" className="block mb-1 text-sm">
                      GREEN: {adjustments.greenScale.toFixed(1)}
                    </label>
                    <input
                      id="greenScale"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={adjustments.greenScale}
                      onChange={(e) => handleSliderChange(e, 'greenScale')}
                      className="w-full brutalist-border p-1 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="blueScale" className="block mb-1 text-sm">
                      BLUE: {adjustments.blueScale.toFixed(1)}
                    </label>
                    <input
                      id="blueScale"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={adjustments.blueScale}
                      onChange={(e) => handleSliderChange(e, 'blueScale')}
                      className="w-full brutalist-border p-1 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button onClick={onReset}>RESET</Button>
          <Button onClick={onProcessImages} variant="secondary">
            PROCESS
          </Button>
          <Button
            onClick={onDownload}
            fullWidth
            className="col-span-2"
            variant="accent"
          >
            DOWNLOAD ALL
          </Button>
        </div>
      </div>
    </Card>
  );
} 