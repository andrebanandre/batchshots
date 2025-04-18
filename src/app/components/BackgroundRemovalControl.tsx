import React, { useState, useEffect } from 'react';
import Button from './Button';
import Card from './Card';
import ProBadge from './ProBadge';
import { useIsPro } from '../hooks/useIsPro';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import ProDialog from './ProDialog';

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
    console.log('handleRemoveBackground called', { isProUser, isProLoading });
    if (!isProUser && !isProLoading) {
      console.log('Showing pro dialog');
      setShowProDialog(true);
      return;
    }
    
    if (applyToAll) {
      onRemoveAllBackgrounds();
    } else if (selectedImageId) {
      onRemoveBackground(selectedImageId);
    }
  };

  // Add useEffect to monitor dialog state
  useEffect(() => {
    console.log('Dialog state changed:', showProDialog);
  }, [showProDialog]);

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
        {showProDialog && typeof document !== 'undefined' && (
          <ProDialog
            onClose={() => setShowProDialog(false)}
            onUpgrade={() => router.push('/pricing')}
            onTry={handleTryFeature}
            featureName="Background Removal"
          />
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
      
          <div className="text-xs space-y-1">
     
       
            <div className="flex items-center space-x-2">
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

        {/* Pro Upgrade Dialog */}
        {showProDialog && typeof document !== 'undefined' && (
          <ProDialog
            onClose={() => setShowProDialog(false)}
            onUpgrade={() => router.push('/pricing')}
            onTry={handleTryFeature}
            featureName="Background Removal"
          />
        )}
      </div>
    </Card>
  );
} 