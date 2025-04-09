import React from 'react';
import Button from './Button';
import { useTranslations } from 'next-intl';

interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageCount: number;
  onStartNewBundle: () => void;
  onContinueEditing: () => void;
  hasAppliedChanges: boolean;
  appliedPresetName?: string;
  isDownloading: boolean;
  downloadComplete: boolean;
  formatType: string;
  hasSeoNames?: boolean;
  hasRemovedBackgrounds?: boolean;
}

export default function DownloadDialog({
  isOpen,
  onClose,
  imageCount,
  onStartNewBundle,
  onContinueEditing,
  hasAppliedChanges,
  appliedPresetName,
  isDownloading,
  downloadComplete,
  formatType,
  hasSeoNames = false,
  hasRemovedBackgrounds = false
}: DownloadDialogProps) {
  const t = useTranslations('Dialogs.download');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg brutalist-border">
        <div className="brutalist-border p-3 -m-[5px] bg-white">
          <div className="brutalist-border p-3 -m-[5px] bg-white">
            <div className="brutalist-border-accent -m-[5px]">
              <div className="p-6">
                {!downloadComplete ? (
                  <>
                    <h3 className="text-xl font-bold mb-4 uppercase">{t('confirmTitle')}</h3>
                    
                    <div className="space-y-4 mb-6">
                      <div className="brutalist-border p-3 bg-slate-50">
                        <p className="font-bold mb-2">{t('summary')}</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>{t('images', { count: imageCount })}</li>
                          <li>{t('format')} <span className="font-bold uppercase">{formatType}</span></li>
                          {hasAppliedChanges && appliedPresetName && (
                            <li>{t('appliedPreset')} <span className="font-bold">{appliedPresetName}</span></li>
                          )}
                          {hasAppliedChanges && (
                            <li>{t('adjustmentsApplied')}</li>
                          )}
                          {hasRemovedBackgrounds && (
                            <li className="text-purple-600 font-semibold">
                              {t('backgroundRemoval')}
                            </li>
                          )}
                          {hasSeoNames && (
                            <li className="text-green-600 font-semibold">
                              <div className="flex items-center">
                                <div className="h-4 w-4 mr-1 flex-shrink-0">
                                  <img 
                                    src="/images/ai-icon.svg" 
                                    alt="AI image processing" 
                                    className="w-full h-full object-contain" 
                                  />
                                </div>
                                {t('seoFilenames')}
                              </div>
                            </li>
                          )}
                          <li>{t('zipPackage')}</li>
                        </ul>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        {t('processingNote')}
                      </p>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={onContinueEditing} 
                        className="mr-2"
                        variant="secondary"
                        disabled={isDownloading}
                      >
                        {t('cancel')}
                      </Button>
                      <Button 
                        onClick={onClose}
                        variant="accent"
                        disabled={isDownloading}
                      >
                        {isDownloading ? t('processing') : t('download')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-4 uppercase">{t('successTitle')}</h3>
                    
                    <div className="space-y-4 mb-6">
                      <p>{t('successMessage')}</p>
                      
                      <div className="brutalist-border p-3 bg-slate-50">
                        <ul className="list-disc pl-5">
                          <li><span className="font-bold">{t('startNewBundleDesc')}</span></li>
                          <li><span className="font-bold">{t('continueEditingDesc')}</span></li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        onClick={onStartNewBundle}
                        variant="secondary"
                      >
                        {t('startNewBundle')}
                      </Button>
                      <Button 
                        onClick={onContinueEditing}
                        variant="accent"
                      >
                        {t('continueEditing')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 