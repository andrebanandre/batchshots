import React, { useState } from 'react';
import Button from './Button';
import Card from './Card';
import ProBadge from './ProBadge';
import { useIsPro } from '../hooks/useIsPro';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface BackgroundRemovalControlProps {
  selectedImageId: string | null;
  isProcessing: boolean;
  isRemovingBackground: boolean;
  hasBackgroundRemoved: boolean;
  applyToAll: boolean;
  totalImages: number;
  processedCount: number;
  onRemoveBackground: (id: string) => void;
  onRemoveAllBackgrounds: () => void;
  className?: string;
  compact?: boolean;
}

export default function BackgroundRemovalControl({
  selectedImageId,
  isProcessing,
  isRemovingBackground,
  hasBackgroundRemoved,
  applyToAll,
  totalImages,
  processedCount,
  onRemoveBackground,
  onRemoveAllBackgrounds,
  className = '',
  compact = false,
}: BackgroundRemovalControlProps) {
  const t = useTranslations('Components.BackgroundRemoval');
  const { isProUser, isLoading: isProLoading } = useIsPro();
  const [showProDialog, setShowProDialog] = useState(false);
  const router = useRouter();
  
  const handleRemoveBackground = () => {
    if (!isProUser && !isProLoading) {
      setShowProDialog(true);
      return;
    }
    
    if (applyToAll) {
      onRemoveAllBackgrounds();
    } else if (selectedImageId) {
      onRemoveBackground(selectedImageId);
    }
  };

  const handleTryFeature = () => {
    setShowProDialog(false);
    router.push('/background-removal');
  };

  // Calculate processing progress percentage
  const progressPercentage = totalImages > 0 ? Math.round((processedCount / totalImages) * 100) : 0;

  // For compact mode (used in AI tab)
  if (compact) {
    return (
      <div className={`${className} space-y-3`}>
        <div className="flex justify-between items-center">
          <h3 className="font-bold">{t('title')} <ProBadge className="ml-1" /></h3>
          <div className="text-xs">
            <span>{applyToAll ? t('allImages') : t('selected')}</span>
          </div>
        </div>
        
        {/* Action Button */}
        <Button
          variant="accent"
          disabled={
            (!selectedImageId && !applyToAll) || 
            isProcessing || 
            isRemovingBackground || 
            (hasBackgroundRemoved && !applyToAll)
          }
          onClick={handleRemoveBackground}
          className="w-full uppercase"
        >
          {isRemovingBackground 
            ? `${t('processing')}${applyToAll ? ' ALL' : ''}...`
            : applyToAll
              ? t('removeAllBackgrounds')
              : hasBackgroundRemoved
                ? t('backgroundRemoved')
                : t('removeBackground')
          }
        </Button>

        {/* Progress Indicator (compact) */}
        {isRemovingBackground && (
          <div className="space-y-1">
            <div className="w-full h-3 brutalist-border bg-white overflow-hidden">
              <div 
                className="h-full bg-[#4F46E5]"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs">
              <span>{t('backgroundsRemoved', { count: processedCount, total: totalImages })}</span>
              <span>{progressPercentage}%</span>
            </div>
          </div>
        )}
        
        {/* Minimal info note */}
        {!isRemovingBackground && (
          <p className="text-xs text-gray-600">
            {t('compactDescription')}
          </p>
        )}
        
        {/* Pro Upgrade Dialog */}
        {showProDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white brutalist-border border-3 border-black p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{t('proDialog.title')}</h3>
                <button onClick={() => setShowProDialog(false)} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <ProBadge className="mr-2" />
                  <span className="font-bold">{t('proDialog.featureTitle')}</span>
                </div>
                
                <p className="mb-4 text-sm">
                  {t('proDialog.description')}
                </p>
                
                <div className="brutalist-border p-3 bg-yellow-50 mb-4">
                  <p className="font-bold text-center mb-2">{t('proDialog.pricing.title')}</p>
                  <p className="text-3xl font-bold text-center">{t('proDialog.pricing.price')}</p>
                  <p className="text-center text-sm text-gray-600">{t('proDialog.pricing.note')}</p>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button 
                  variant="primary"
                  onClick={() => router.push('/pricing')}
                  className="w-full"
                >
                  {t('proDialog.actions.upgrade')}
                </Button>
                
                <Button 
                  variant="secondary"
                  onClick={handleTryFeature}
                  className="w-full"
                >
                  {t('proDialog.actions.try')}
                </Button>
                
                <button 
                  onClick={() => setShowProDialog(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  {t('proDialog.actions.later')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Original full version (used as standalone card)
  return (
    <Card
      title={t('title')}
      className={className}
      variant="accent"
    >
      <div className="space-y-4">
        {/* Info Section */}
        <div className="brutalist-border p-4 bg-white">
          <h3 className="font-bold mb-2">{t('title')} <ProBadge className="ml-1" /></h3>
          <p className="text-sm mb-2">
            {t('description')}
          </p>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="font-bold">{t('processingInfo.process')}:</span>
              <span>{t('processingInfo.processValue')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">{t('processingInfo.result')}:</span>
              <span>{t('processingInfo.resultValue')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">{t('processingInfo.mode')}:</span>
              <span>{applyToAll ? t('allImages') : t('selected')}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Remove Background Button */}
          <Button
            variant="accent"
            disabled={
              (!selectedImageId && !applyToAll) || 
              isProcessing || 
              isRemovingBackground || 
              (hasBackgroundRemoved && !applyToAll)
            }
            onClick={handleRemoveBackground}
            className="w-full uppercase"
          >
            {isRemovingBackground 
              ? `${t('processing')}...`
              : applyToAll
                ? t('removeAllBackgrounds')
                : hasBackgroundRemoved
                  ? t('backgroundRemoved')
                  : t('removeBackground')
            }
          </Button>
        </div>

        {/* Progress Indicator */}
        {isRemovingBackground && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold">{t('processingInfo.process')}:</span>
              <span>{t('backgroundsRemoved', { count: processedCount, total: totalImages })}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-3 brutalist-border bg-white overflow-hidden">
              <div 
                className="h-full bg-[#4F46E5]"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-center mt-1">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 rounded-full border-2 border-[#4F46E5] animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-b-0 border-r-0 border-2 border-[#4F46E5] animate-spin"></div>
              </div>
            </div>
          </div>
        )}

        {/* Display message when background already removed */}
        {hasBackgroundRemoved && !isRemovingBackground && !applyToAll && (
          <div className="brutalist-border p-3 bg-blue-50 text-center">
            <span className="text-sm font-bold">{t('transparent')}</span>
          </div>
        )}
      </div>
    </Card>
  );
} 