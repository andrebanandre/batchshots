import React, { useState } from 'react';
import Card from './Card';
import ProBadge from './ProBadge';
import BackgroundRemovalControl from './BackgroundRemovalControl';
import QuickPresets from './QuickPresets';
import { useImageProcessing } from '../contexts/ImageProcessingContext';
import { useTranslations } from 'next-intl';

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
  className?: string;
}

export default function ImageProcessingControls({
  className = '',
}: ImageProcessingControlsProps) {
  const t = useTranslations('Components.ImageProcessingControls');
  
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'ai'>('basic');
  
  const {
    adjustments,
    setAdjustments,
    applyToAll,
    setApplyToAll,
    handleReset,
    selectedImageId,
    isProcessing,
    isRemovingBackground,
    hasBackgroundRemoved,
    totalImages,
    processedCount,
    handleRemoveBackground,
    handleRemoveAllBackgrounds
  } = useImageProcessing();

  const handleSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    property: keyof ImageAdjustments
  ) => {
    const value = parseFloat(e.target.value);
    setAdjustments({
      ...adjustments,
      [property]: value,
    });
  };

  const handleApplyAllChange = () => {
    setApplyToAll(!applyToAll);
  };

  return (
    <Card 
      title={t('title')} 
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
          {t('reset')}
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
            <span className="font-bold">{t('applyToAll')}</span>
          </label>
        </div>

        {/* Tabs for Basic/Advanced/AI Controls */}
        <div className="border-b-2 border-black mb-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-4 font-bold ${activeTab === 'basic' ? 'bg-primary text-white' : 'bg-white text-black'}`}
            >
              {t('basic')}
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-2 px-4 font-bold ${activeTab === 'advanced' ? 'bg-primary text-white' : 'bg-white text-black'}`}
            >
              {t('advanced')}
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-2 px-4 font-bold flex items-center ${activeTab === 'ai' ? 'bg-primary text-white' : 'bg-white text-black'}`}
            >
              {t('ai')} <ProBadge className="ml-1" />
            </button>
          </div>
        </div>

        {activeTab === 'basic' ? (
          <>
            {/* Basic Controls */}
            <div className="space-y-4">
              {/* Quick Presets - only in basic tab */}
              <QuickPresets />
              
              <div className="mt-6">
                <label htmlFor="brightness" className="block mb-1 font-bold">
                  {t('brightness')}: {adjustments.brightness}
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
                  {t('contrast')}: {adjustments.contrast}
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
                  {t('sharpen')}: {adjustments.sharpen?.toFixed(1) || '0.0'}
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
        ) : activeTab === 'advanced' ? (
          <>
            {/* Advanced Controls */}
            <div className="space-y-6">
              {/* Modulate (HSL) controls - More prominent styling */}
              <div className="brutalist-border p-3 bg-white">
                <h3 className="font-bold mb-3 text-lg uppercase">{t('colorAdjust')}</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="hue" className="block mb-1 font-bold">
                      {t('hue')}: {adjustments.hue?.toFixed(0) || '100'}
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">{t('cooler')}</span>
                      <input
                        id="hue"
                        type="range"
                        min="0"
                        max="200"
                        value={adjustments.hue || 100}
                        onChange={(e) => handleSliderChange(e, 'hue')}
                        className="flex-1 brutalist-border bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 h-6 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="ml-2 text-xs">{t('warmer')}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="saturation" className="block mb-1 font-bold">
                      {t('saturation')}: {adjustments.saturation?.toFixed(0) || '100'}
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">{t('less')}</span>
                      <input
                        id="saturation"
                        type="range"
                        min="0"
                        max="200"
                        value={adjustments.saturation || 100}
                        onChange={(e) => handleSliderChange(e, 'saturation')}
                        className="flex-1 brutalist-border bg-gradient-to-r from-gray-400 to-red-600 h-6 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="ml-2 text-xs">{t('more')}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="lightness" className="block mb-1 font-bold">
                      {t('lightness')}: {adjustments.lightness?.toFixed(0) || '100'}
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2 text-xs">{t('darker')}</span>
                      <input
                        id="lightness"
                        type="range"
                        min="0"
                        max="200"
                        value={adjustments.lightness || 100}
                        onChange={(e) => handleSliderChange(e, 'lightness')}
                        className="flex-1 brutalist-border bg-gradient-to-r from-gray-900 to-white h-6 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                      <span className="ml-2 text-xs">{t('lighter')}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* RGB controls */}
              <div className="brutalist-border p-3 bg-white">
                <h3 className="font-bold mb-3 text-lg uppercase">{t('colorBalance')}</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="redScale" className="block mb-1 font-bold">
                      {t('red')}: {adjustments.redScale?.toFixed(2) || '1.00'}
                    </label>
                    <input
                      id="redScale"
                      type="range"
                      min="0"
                      max="2"
                      step="0.01"
                      value={adjustments.redScale || 1}
                      onChange={(e) => handleSliderChange(e, 'redScale')}
                      className="w-full brutalist-border bg-gradient-to-r from-gray-200 to-red-600 h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="greenScale" className="block mb-1 font-bold">
                      {t('green')}: {adjustments.greenScale?.toFixed(2) || '1.00'}
                    </label>
                    <input
                      id="greenScale"
                      type="range"
                      min="0"
                      max="2"
                      step="0.01"
                      value={adjustments.greenScale || 1}
                      onChange={(e) => handleSliderChange(e, 'greenScale')}
                      className="w-full brutalist-border bg-gradient-to-r from-gray-200 to-green-600 h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="blueScale" className="block mb-1 font-bold">
                      {t('blue')}: {adjustments.blueScale?.toFixed(2) || '1.00'}
                    </label>
                    <input
                      id="blueScale"
                      type="range"
                      min="0"
                      max="2"
                      step="0.01"
                      value={adjustments.blueScale || 1}
                      onChange={(e) => handleSliderChange(e, 'blueScale')}
                      className="w-full brutalist-border bg-gradient-to-r from-gray-200 to-blue-600 h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // AI Background Removal tab
          <BackgroundRemovalControl 
            selectedImageId={selectedImageId}
            isProcessing={isProcessing}
            isRemovingBackground={isRemovingBackground}
            hasBackgroundRemoved={hasBackgroundRemoved}
            applyToAll={applyToAll}
            totalImages={totalImages}
            processedCount={processedCount}
            onRemoveBackground={handleRemoveBackground}
            onRemoveAllBackgrounds={handleRemoveAllBackgrounds}
          />
        )}
      </div>
    </Card>
  );
} 