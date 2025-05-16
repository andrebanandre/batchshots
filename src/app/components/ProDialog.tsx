import React from 'react';
import Button from './Button';
import ProBadge from './ProBadge';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

interface ProDialogProps {
  onClose: () => void;
  onUpgrade: () => void;
  onTry: () => void;
  featureName: string;
  featureLimit?: number;
}

export default function ProDialog({
  onClose,
  onUpgrade,
  onTry,
  featureName,
  featureLimit,
}: ProDialogProps) {
  const t = useTranslations('Components.ProUpgrade');
  // Get SeoNameGenerator translations for the Try button text
  const tSeo = useTranslations('Components.SeoNameGenerator');

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white brutalist-border border-3 border-black p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{t('title')}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <ProBadge className="mr-2" />
            <span className="font-bold">{t('unlock')}</span>
          </div>
          
          <p className="mb-4 text-sm">
            {/* Always use the 'description' key, with default count of 100 if not provided */}
            {t('description', { 
              feature: featureName, 
              count: featureLimit || 100 
            })}
          </p>
          
          <div className="brutalist-border p-3 bg-yellow-50 mb-4">
            <p className="font-bold text-center mb-2">{t('pricing.title')}</p>
            <p className="text-3xl font-bold text-center">{t('pricing.price')}</p>
            <p className="text-center text-sm text-gray-600">{t('pricing.note')}</p>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            variant="primary"
            onClick={onUpgrade}
            className="w-full"
          >
            {t('learnMore')}
          </Button>
          
          <Button 
            variant="secondary"
            onClick={onTry}
            className="w-full"
          >
            {tSeo('tryFeature')}
          </Button>
          
          <button 
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
} 