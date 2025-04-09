'use client';

import React from 'react';
import { useImageProcessing } from '../contexts/ImageProcessingContext';
import { defaultAdjustments } from './ImageProcessingControls';
import { useTranslations } from 'next-intl';

type PresetType = 
  | 'vivid' 
  | 'sharp' 
  | 'classic' 
  | 'clean' 
  | 'white-bg' 
  | 'dramatic' 
  | 'jewelry' 
  | 'soft-product' 
  | 'textile' 
  | 'food' 
  | 'furniture' 
  | 'transparent';

export default function QuickPresets() {
  const { setAdjustments } = useImageProcessing();
  const t = useTranslations('Components.QuickPresets');
  
  const handleQuickPreset = (preset: PresetType) => {
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
    
    setAdjustments(newAdjustments);
  };

  return (
    <div>
      <h3 className="font-bold mb-2">{t('title')}</h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={() => handleQuickPreset('white-bg')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.white-bg.description')}
        >
          {t('presets.white-bg.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('clean')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.clean.description')}
        >
          {t('presets.clean.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('jewelry')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.jewelry.description')}
        >
          {t('presets.jewelry.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('sharp')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.sharp.description')}
        >
          {t('presets.sharp.name')}
        </button>
      </div>
      
      <h3 className="font-bold mb-2 mt-4 text-xs text-[#4f46e5]">{t('productSpecialty')}</h3>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleQuickPreset('textile')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.textile.description')}
        >
          {t('presets.textile.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('soft-product')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.soft-product.description')}
        >
          {t('presets.soft-product.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('furniture')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.furniture.description')}
        >
          {t('presets.furniture.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('transparent')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.transparent.description')}
        >
          {t('presets.transparent.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('food')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.food.description')}
        >
          {t('presets.food.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('dramatic')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.dramatic.description')}
        >
          {t('presets.dramatic.name')}
        </button>
      </div>
      
      <h3 className="font-bold mb-2 mt-4 text-xs text-[#4f46e5]">{t('colorStyle')}</h3>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleQuickPreset('vivid')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.vivid.description')}
        >
          {t('presets.vivid.name')}
        </button>
        <button
          onClick={() => handleQuickPreset('classic')}
          className="brutalist-border px-2 py-1 text-sm hover:bg-slate-100"
          title={t('presets.classic.description')}
        >
          {t('presets.classic.name')}
        </button>
      </div>
    </div>
  );
} 