import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import { useTranslations } from 'next-intl';

export type ImageFormat = 'jpg' | 'webp' | 'png';

interface DownloadOptionsProps {
  onDownload: (format: ImageFormat) => void;
  hasBackgroundRemovedImages?: boolean;
  hasSeoProductDescription?: boolean;
}

export default function DownloadOptions({ 
  onDownload, 
  hasBackgroundRemovedImages = false,
  hasSeoProductDescription = false
}: DownloadOptionsProps) {
  const t = useTranslations('Components.DownloadOptions');
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>('jpg');
  
  const handleDownload = () => {
    onDownload(selectedFormat);
  };
  
  return (
    <Card title={t('title')} variant="accent" collapsible={false}>
      <div className="space-y-4">
        <div className="brutalist-border p-3 bg-white">
          <h3 className="font-bold mb-3 text-sm uppercase">{t('format')}</h3>
          <div className="flex space-x-2">
            <label className={`flex items-center space-x-1 ${selectedFormat === 'jpg' ? 'border-black border-2 p-1' : 'border p-1'}`}>
              <input
                type="radio"
                name="format"
                value="jpg"
                checked={selectedFormat === 'jpg'}
                onChange={() => setSelectedFormat('jpg')}
                className="form-radio"
              />
              <span className="text-sm uppercase">JPG</span>
            </label>
            
            <label className={`flex items-center space-x-1 ${selectedFormat === 'png' ? 'border-black border-2 p-1' : 'border p-1'}`}>
              <input
                type="radio"
                name="format"
                value="png"
                checked={selectedFormat === 'png'}
                onChange={() => setSelectedFormat('png')}
                className="form-radio"
              />
              <span className="text-sm uppercase">PNG</span>
            </label>
            
            <label className={`flex items-center space-x-1 ${selectedFormat === 'webp' ? 'border-black border-2 p-1' : 'border p-1'}`}>
              <input
                type="radio"
                name="format"
                value="webp"
                checked={selectedFormat === 'webp'}
                onChange={() => setSelectedFormat('webp')}
                className="form-radio"
              />
              <span className="text-sm uppercase">WEBP</span>
            </label>
          </div>
          
          {hasBackgroundRemovedImages && (
            <p className="text-xs mt-2 text-purple-600">
              {t('transparentNote')}
            </p>
          )}
          
          {hasSeoProductDescription && (
            <p className="text-xs mt-2 text-green-600">
              {t('seoProductDescription')}
            </p>
          )}
        </div>
        
        <Button onClick={handleDownload} fullWidth variant="accent">
          {t('downloadAll')}
        </Button>
      </div>
    </Card>
  );
} 