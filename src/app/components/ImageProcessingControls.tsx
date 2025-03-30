import React, { useState } from 'react';
import Card from './Card';

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  redScale: number;
  greenScale: number;
  blueScale: number;
  sharpen: number;    // For adaptive sharpen 
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
  saturation: 100,
  hue: 100,
  lightness: 100
};

export type ImageFormat = 'jpg' | 'webp';

interface ImageProcessingControlsProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: ImageAdjustments) => void;
  applyToAll: boolean;
  setApplyToAll: (value: boolean) => void;
  className?: string;
  onReset?: () => void;
}

export default function ImageProcessingControls({
  adjustments,
  onAdjustmentsChange,
  applyToAll,
  setApplyToAll,
  className = '',
  onReset,
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

  const handleApplyAllChange = () => {
    setApplyToAll(!applyToAll);
  };

  const handleReset = () => {
    onAdjustmentsChange(defaultAdjustments);
    if (onReset) {
      onReset();
    }
  };

  const handleQuickPreset = (preset: 'vivid' | 'sharp' | 'classic' | 'clean' | 'white-bg' | 'dramatic' | 'jewelry' | 'soft-product' | 'textile' | 'food' | 'furniture' | 'transparent') => {
    let newAdjustments = { ...defaultAdjustments };
    
    switch (preset) {
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
      case 'clean':
        // Product photography preset with clean, neutral colors
        newAdjustments = {
          ...newAdjustments,
          contrast: 5,
          brightness: 10,
          sharpen: 1.0,
          redScale: 1.0,
          greenScale: 1.0,
          blueScale: 1.0,
          saturation: 95, // Slightly desaturated
          lightness: 105  // Slightly brighter
        };
        break;
      case 'white-bg':
        // Clean white background product photography
        newAdjustments = {
          ...newAdjustments,
          brightness: 25,
          contrast: 15,
          sharpen: 1.2,
          saturation: 90,
          lightness: 115
        };
        break;
      case 'dramatic':
        // High contrast product photography
        newAdjustments = {
          ...newAdjustments,
          contrast: 25,
          brightness: 5,
          sharpen: 1.8,
          saturation: 110,
          lightness: 95
        };
        break;
      case 'jewelry':
        // Jewelry and metallic products
        newAdjustments = {
          ...newAdjustments,
          contrast: 15,
          brightness: 10,
          sharpen: 2.0,
          redScale: 1.05,
          greenScale: 1.02,
          blueScale: 1.1,
          saturation: 85, // Lower saturation to highlight metal
          lightness: 108  // Slightly brighter to enhance shine
        };
        break;
      case 'soft-product':
        // For soft products like pillows, cushions, plush toys
        newAdjustments = {
          ...newAdjustments,
          contrast: 5,
          brightness: 15,
          sharpen: 0.6, // Less sharpening for soft appearance
          saturation: 105,
          lightness: 110,
          redScale: 1.02,
          greenScale: 1.02,
          blueScale: 1.0
        };
        break;
      case 'textile':
        // For fabric and textile products - enhances texture and color
        newAdjustments = {
          ...newAdjustments,
          contrast: 12,
          brightness: 8,
          sharpen: 1.3, // Moderate sharpening for texture detail
          saturation: 110, // Slightly boosted saturation for fabric colors
          lightness: 103,
          redScale: 1.02,
          greenScale: 1.0,
          blueScale: 0.98
        };
        break;
      case 'food':
        // Food photography - enhances freshness and color appeal
        newAdjustments = {
          ...newAdjustments,
          contrast: 18,
          brightness: 5,
          sharpen: 1.6, // Strong sharpening for texture detail
          saturation: 115, // Boosted saturation for appetizing colors
          lightness: 105,
          redScale: 1.05, // Slightly warmer tones
          greenScale: 1.03,
          blueScale: 0.97
        };
        break;
      case 'furniture':
        // Wooden furniture and home decor
        newAdjustments = {
          ...newAdjustments,
          contrast: 10,
          brightness: 8,
          sharpen: 1.4, // Good sharpening for wood grain
          saturation: 95, // Slightly reduced saturation for natural look
          lightness: 102,
          redScale: 1.03, // Warmer tones for wood
          greenScale: 1.0,
          blueScale: 0.95
        };
        break;
      case 'transparent':
        // Glass and transparent products
        newAdjustments = {
          ...newAdjustments,
          contrast: 20,
          brightness: 12,
          sharpen: 1.1, // Moderate sharpening for edges
          saturation: 85, // Reduced saturation for clarity
          lightness: 112, // Brighter for transparency
          redScale: 0.98,
          greenScale: 1.0,
          blueScale: 1.04 // Slight cool tint for glass-like appearance
        };
        break;
    }
    
    onAdjustmentsChange(newAdjustments);
  };

  return (
    <Card 
      title="IMAGE ADJUSTMENTS" 
      className={className} 
      variant="accent"
      headerRight={
        <button 
          onClick={handleReset} 
          className="text-sm font-bold py-1 px-2 brutalist-border hover:bg-slate-100 text-gray-700 flex items-center"
          title="Reset all adjustments"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          RESET
        </button>
      }
    >
      <div className="space-y-6">
        {/* Mode Toggle (Apply to All vs Individual) */}
        <div className="flex justify-between items-center">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={handleApplyAllChange}
              className="mr-2 brutalist-border w-4 h-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black"
              style={{
                backgroundImage: applyToAll ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")" : "",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }}
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
        <div>
          <h3 className="font-bold mb-2">QUICK PRESETS</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => handleQuickPreset('white-bg')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              WHITE BACKGROUND
            </button>
            <button
              onClick={() => handleQuickPreset('clean')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              CLEAN PRODUCT
            </button>
            <button
              onClick={() => handleQuickPreset('jewelry')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              JEWELRY/METAL
            </button>
            <button
              onClick={() => handleQuickPreset('sharp')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              SHARP DETAIL
            </button>
          </div>
          
          <h3 className="font-bold mb-2 mt-4 text-xs text-[#4f46e5]">PRODUCT SPECIALTY</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickPreset('textile')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              TEXTILE/FABRIC
            </button>
            <button
              onClick={() => handleQuickPreset('soft-product')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              SOFT PRODUCTS
            </button>
            <button
              onClick={() => handleQuickPreset('furniture')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              FURNITURE/WOOD
            </button>
            <button
              onClick={() => handleQuickPreset('transparent')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              GLASS
            </button>
            <button
              onClick={() => handleQuickPreset('food')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              FOOD PRODUCTS
            </button>
            <button
              onClick={() => handleQuickPreset('dramatic')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              DRAMATIC
            </button>
          </div>
          
          <h3 className="font-bold mb-2 mt-4 text-xs text-[#4f46e5]">COLOR STYLE</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickPreset('vivid')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              VIVID COLORS
            </button>
            <button
              onClick={() => handleQuickPreset('classic')}
              className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
            >
              CLASSIC
            </button>
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

              <div>
                <label htmlFor="sharpen" className="block mb-1 font-bold">
                  SHARPEN: {adjustments.sharpen?.toFixed(1) || '0.0'}
                </label>
                <input
                  id="sharpen"
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={adjustments.sharpen || 0}
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
              {/* Modulate (HSL) controls - More prominent styling */}
              <div className="brutalist-border p-3 bg-white">
                <h3 className="font-bold mb-3 text-lg uppercase">COLOR ADJUST (HSL)</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="hue" className="block mb-1 font-bold">
                      HUE: {adjustments.hue?.toFixed(0) || '100'}
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">COOLER</span>
                      <input
                        id="hue"
                        type="range"
                        min="0"
                        max="200"
                        value={adjustments.hue || 100}
                        onChange={(e) => handleSliderChange(e, 'hue')}
                        className="flex-1 brutalist-border bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 h-6 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="ml-2 text-xs">WARMER</span>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="saturation" className="block mb-1 font-bold">
                      SATURATION: {adjustments.saturation?.toFixed(0) || '100'}
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">LESS</span>
                      <input
                        id="saturation"
                        type="range"
                        min="0"
                        max="200"
                        value={adjustments.saturation || 100}
                        onChange={(e) => handleSliderChange(e, 'saturation')}
                        className="flex-1 brutalist-border bg-gradient-to-r from-gray-400 to-red-600 h-6 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="ml-2 text-xs">MORE</span>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="lightness" className="block mb-1 font-bold">
                      LIGHTNESS: {adjustments.lightness?.toFixed(0) || '100'}
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">DARKER</span>
                      <input
                        id="lightness"
                        type="range"
                        min="0"
                        max="200"
                        value={adjustments.lightness || 100}
                        onChange={(e) => handleSliderChange(e, 'lightness')}
                        className="flex-1 brutalist-border bg-gradient-to-r from-gray-900 to-white h-6 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="ml-2 text-xs">LIGHTER</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* RGB Scale controls */}
              <div>
                <h3 className="font-bold mb-2">RGB SCALING</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <label htmlFor="redScale" className="block w-32 font-bold">
                      RED: {adjustments.redScale?.toFixed(1) || '1.0'}
                    </label>
                    <input
                      id="redScale"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={adjustments.redScale || 1.0}
                      onChange={(e) => handleSliderChange(e, 'redScale')}
                      className="w-20 brutalist-border bg-white h-8 px-2"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label htmlFor="greenScale" className="block w-32 font-bold">
                      GREEN: {adjustments.greenScale?.toFixed(1) || '1.0'}
                    </label>
                    <input
                      id="greenScale"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={adjustments.greenScale || 1.0}
                      onChange={(e) => handleSliderChange(e, 'greenScale')}
                      className="w-20 brutalist-border bg-white h-8 px-2"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label htmlFor="blueScale" className="block w-32 font-bold">
                      BLUE: {adjustments.blueScale?.toFixed(1) || '1.0'}
                    </label>
                    <input
                      id="blueScale"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={adjustments.blueScale || 1.0}
                      onChange={(e) => handleSliderChange(e, 'blueScale')}
                      className="w-20 brutalist-border bg-white h-8 px-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
} 