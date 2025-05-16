import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Card from './Card';
import Button from './Button';
import { useImageProcessing } from '../contexts/ImageProcessingContext'; // Import context hook

export type WatermarkType = 'text' | 'logo' | null;
export type WatermarkPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center' | 'diagonal' | 'tile';

export interface WatermarkSettings {
  enabled: boolean;
  type: WatermarkType;
  text: string;
  font: string;
  textColor: string;
  logoDataUrl: string | null; // Store logo as data URL
  logoFile: File | null; // Store original logo file if needed
  opacity: number; // 0 to 1
  size: number; // Relative size (e.g., percentage of image width/height)
  position: WatermarkPosition;
}

export const defaultWatermarkSettings: WatermarkSettings = {
  enabled: false,
  type: null,
  text: 'BatchShots.com',
  font: 'Arial',
  textColor: '#ffffff',
  logoDataUrl: null,
  logoFile: null,
  opacity: 0.5,
  size: 10, // e.g., 10% 
  position: 'bottomRight',
};

// Basic font options
const fontOptions = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Impact'];

interface WatermarkControlProps {
  className?: string;
}

export default function WatermarkControl({
  className = '',
}: WatermarkControlProps) {
  const t = useTranslations('Components.WatermarkControl');
  const tPresets = useTranslations('Components.WatermarkControl.presets');
  const [addTypeTab, setAddTypeTab] = useState<WatermarkType>('text');

  const { watermarkSettings, setWatermarkSettings, handleReset: contextHandleReset } = useImageProcessing();

  const handleReset = () => {
    contextHandleReset();
    setAddTypeTab('text');
    const logoInput = document.getElementById('logoUpload') as HTMLInputElement;
    if (logoInput) logoInput.value = ''; 
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setWatermarkSettings(prev => ({
          ...prev,
          enabled: true,
          type: 'logo',
          logoDataUrl: event.target?.result as string,
          logoFile: file,
        }));
        setAddTypeTab('logo');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; 
  };
  
  const handleInputChange = (field: keyof WatermarkSettings, value: string | number | WatermarkPosition | WatermarkType | null | boolean) => {
    setWatermarkSettings(prev => {
      let currentType = prev.type;
      let currentEnabled = prev.enabled;

      // Determine the correct type based on the field changed or the active tab
      if (field === 'type') {
          currentType = value as WatermarkType;
          currentEnabled = true; // Changing type enables it
      } else if (field === 'text') {
          currentType = 'text';
          currentEnabled = true; // Changing text enables it
      } else if (field === 'logoDataUrl' && value !== null) {
          currentType = 'logo';
          currentEnabled = true; // Uploading logo enables it
      } else if (['opacity', 'size', 'position', 'font', 'textColor'].includes(field)) {
           // If changing shared setting and type is null, set based on active tab
           if (!currentType) {
               currentType = addTypeTab;
           }
          currentEnabled = true; // Changing settings enables it
      } else if (field === 'enabled') {
           currentEnabled = value as boolean; // Directly use the boolean value
           // If disabling, reset type to null
           if (!currentEnabled) {
               currentType = null;
           }
      }

      return {
        ...prev,
        enabled: currentEnabled, // Use the determined boolean value
        type: currentType, // Set the determined type
        [field]: value,
      };
    });
  };

  const handleAddTypeTabSwitch = (newTab: WatermarkType) => {
      setAddTypeTab(newTab);
      if (watermarkSettings.enabled || (newTab === 'logo' && watermarkSettings.logoDataUrl)) {
         handleInputChange('type', newTab);
      }
  };

  const PositionButton = ({ preset }: { preset: WatermarkPosition }) => (
    <Button
      size="sm"
      variant={watermarkSettings.position === preset ? 'accent' : 'default'}
      onClick={() => handleInputChange('position', preset)}
      className="flex-1 min-w-[80px] text-center"
      title={tPresets(preset)}
    >
      {preset === 'topLeft' && '◤'}
      {preset === 'topRight' && '◥'}
      {preset === 'bottomLeft' && '◣'}
      {preset === 'bottomRight' && '◢'}
      {preset === 'center' && '●'}
      {preset === 'diagonal' && '\\'} 
      {preset === 'tile' && '▦'}
    </Button>
  );

  return (
    <Card
      title={t('title')}
      className={className}
      variant="default"
      headerRight={
        <button 
          onClick={handleReset}
          className="text-sm font-bold py-1 px-2 brutalist-border hover:bg-slate-100 text-gray-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('reset')}
          disabled={!watermarkSettings.enabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      }
    >
      <div className="space-y-4">
  

        {/* Add Watermark Content */}
          <div className="space-y-4">
            {/* Type Tabs (Text / Logo) */}
            <div className="flex space-x-2 mb-4">
              <Button 
                variant={addTypeTab === 'text' ? 'accent' : 'default'}
                size="sm"
                onClick={() => handleAddTypeTabSwitch('text')}
              >
                {t('text')}
              </Button>
              <Button 
                variant={addTypeTab === 'logo' ? 'accent' : 'default'}
                size="sm"
                onClick={() => handleAddTypeTabSwitch('logo')}
              >
                {t('logo')}
              </Button>
            </div>

            {/* Shared Controls (Opacity, Size, Position) */} 
            <div className="space-y-4 p-3 brutalist-border bg-gray-50">
                <div>
                  <label htmlFor="watermarkOpacity" className="block mb-1 font-bold">
                    {t('opacity')}: {Math.round(watermarkSettings.opacity * 100)}%
                  </label>
                  <input
                    id="watermarkOpacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={watermarkSettings.opacity}
                    onChange={(e) => handleInputChange('opacity', parseFloat(e.target.value))}
                    className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>

                <div>
                  <label htmlFor="watermarkSize" className="block mb-1 font-bold">
                    {t('size')}: {watermarkSettings.size}% 
                  </label>
                  <input
                    id="watermarkSize"
                    type="range"
                    min="1" 
                    max="50" // Max 50% size relative to image 
                    step="1"
                    value={watermarkSettings.size}
                    onChange={(e) => handleInputChange('size', parseInt(e.target.value))}
                    className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold">{t('position')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <PositionButton preset="topLeft" />
                    <PositionButton preset="topRight" />
                    <PositionButton preset="center" />
                    <PositionButton preset="bottomLeft" />
                    <PositionButton preset="bottomRight" />
                    <PositionButton preset="diagonal" />
                    <PositionButton preset="tile" /> 
                  </div>
                </div>
            </div>

            {/* Text Watermark Controls */}
            {addTypeTab === 'text' && (
              <div className="space-y-4 p-3 brutalist-border bg-white">
                <h3 className="font-bold uppercase mb-2">{t('text')} {t('title')}</h3>
                <div>
                  <label htmlFor="watermarkText" className="block mb-1 font-bold">{t('text')}</label>
                  <input
                    id="watermarkText"
                    type="text"
                    placeholder={t('enterText')}
                    value={watermarkSettings.text}
                    onChange={(e) => handleInputChange('text', e.target.value)}
                    className="w-full p-2 brutalist-border"
                  />
                </div>
                
                <div>
                  <label htmlFor="watermarkFont" className="block mb-1 font-bold">{t('font')}</label>
                  <select
                    id="watermarkFont"
                    value={watermarkSettings.font}
                    onChange={(e) => handleInputChange('font', e.target.value)}
                    className="w-full p-2 brutalist-border bg-white"
                    style={{ fontFamily: watermarkSettings.font }} // Preview font in select
                  >
                    {fontOptions.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="watermarkColor" className="block mb-1 font-bold">{t('color')}</label>
                   <div className="flex items-center space-x-2">
                       <input
                        id="watermarkColor"
                        type="color" // Use native color picker
                        value={watermarkSettings.textColor}
                        onChange={(e) => handleInputChange('textColor', e.target.value)}
                        className="p-1 h-10 w-10 block bg-white brutalist-border cursor-pointer"
                       />
                        <input 
                            type="text"
                            value={watermarkSettings.textColor}
                             onChange={(e) => handleInputChange('textColor', e.target.value)}
                            className="p-2 brutalist-border w-24"
                            placeholder="#ffffff"
                        />
                   </div>
                </div>
              </div>
            )}

            {/* Logo Watermark Controls */}
            {addTypeTab === 'logo' && (
              <div className="space-y-4 p-3 brutalist-border bg-white">
                <h3 className="font-bold uppercase mb-2">{t('logo')} {t('title')}</h3>
                <div>
                  {/* <label htmlFor="logoUpload" className="block mb-1 font-bold">{t('uploadLogo')}</label> */} 
                  <input 
                    type="file"
                    id="logoUpload"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml" // Accept common image types
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <label 
                    htmlFor="logoUpload"
                    className="w-full p-4 brutalist-border bg-gray-50 text-center cursor-pointer block hover:bg-gray-100"
                  >
                    {watermarkSettings.logoDataUrl ? (
                      <Image 
                        src={watermarkSettings.logoDataUrl} 
                        alt="Logo Preview" 
                        width={64} // Example width, adjust as needed
                        height={64} // Example height, adjust as needed
                        className="max-h-16 mx-auto mb-2" // Removed object-contain here
                        style={{ objectFit: 'contain' }} // Added objectFit style
                      />
                    ) : null}
                    <span className="text-sm text-gray-500">
                        {watermarkSettings.logoDataUrl ? t('uploadLogo') : t('logoPlaceholder')} 
                    </span>
                  </label>
                </div>
              </div>
            )}

          </div>

      </div>
    </Card>
  );
} 