'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsPro } from '../../hooks/useIsPro';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ProBadge from '../../components/ProBadge';
import PricingCard from '../../components/PricingCard';
import { ImageFile } from '../../components/ImagePreview';
import { createImageFile, processImage, downloadImage, downloadAllImages } from '../../lib/imageProcessing';
import { processImageBackground, getUpdatedImageWithBackground } from '../../lib/backgroundRemoval';
import { initOpenCV } from '../../lib/imageProcessing';
import Loader from '../../components/Loader';
import { defaultAdjustments } from '../../components/ImageProcessingControls';
import { useTranslations } from 'next-intl';
import { defaultWatermarkSettings } from '@/app/components/WatermarkControl';

export default function BackgroundRemovalPage() {
  const t = useTranslations('Components.BackgroundRemovalPage');
  const { isProUser, isLoading: isProLoading } = useIsPro();
  const router = useRouter();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);

  // Initialize OpenCV
  useEffect(() => {
    const loadOpenCV = async () => {
      try {
        await initOpenCV();
        setIsOpenCVReady(true);
        console.log('OpenCV.js initialized successfully');
      } catch (error) {
        console.error('Failed to initialize OpenCV.js', error);
      }
    };

    loadOpenCV();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    let fileArray = Array.from(e.target.files);
    
    // For free users, limit to 1 image
    if (!isProUser && !isProLoading) {
      if (fileArray.length > 1) {
        alert("Free users can only process 1 image at a time. Upgrade to PRO to process up to 100 images in bulk!");
        fileArray = [fileArray[0]];
      }
    } else {
      // For PRO users, limit to 100 images
      if (fileArray.length > 100) {
        alert("Maximum 100 images allowed at once.");
        fileArray = fileArray.slice(0, 100);
      }
    }
    
    try {
      setIsProcessing(true);
      const newImages = await Promise.all(fileArray.map(createImageFile));
      setImages(newImages);
    } catch (error) {
      console.error('Error processing uploaded files', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (images.length === 0) return;
    
    // For free users, check if they're trying to process more than 1 image
    if (!isProUser && !isProLoading && images.length > 1) {
      setShowProUpgrade(true);
      return;
    }
    
    setIsRemovingBackground(true);
    
    try {
      // Process each image to remove background
      const processed: ImageFile[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Update progress percentage
        setProgressPercent(Math.round((i / images.length) * 100));
        
        // Process image with background removal
        const processedData = await processImageBackground(image);
        
        // Create a new image with the processed data
        const processedImage = getUpdatedImageWithBackground(image, processedData);
        
        // Apply minimal adjustments to the image
        const { processedThumbnailUrl } = await processImage(processedImage, defaultAdjustments, null, defaultWatermarkSettings, false);
        
        // Add to processed images
        processed.push({
          ...processedImage,
          processedThumbnailUrl
        });
      }
      
      setProgressPercent(100);
      setImages(processed); // Replace original images with processed ones
    } catch (error) {
      console.error('Error in background removal:', error);
      alert('Background removal failed. Please try again.');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleDownload = () => {
    if (images.length === 0) return;
    
    // Use existing downloadAllImages function with ZIP for multiple images
    if (images.length > 1) {
      downloadAllImages(images, 'png', true);
    } else if (images.length === 1) {
      // For a single image, just download directly
      const image = images[0];
      if (image.backgroundRemoved && image.dataUrl) {
        downloadImage(image.dataUrl, image.file.name, 'png');
      }
    }
  };

  const handleTryMain = () => {
    router.push('/');
  };

  return (
    <>
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="brutalist-accent-card mb-8">
          <h1 className="text-3xl font-bold text-center uppercase mb-6">
            {t('title')}
          </h1>
          
          {!isOpenCVReady || isProLoading ? (
            <div className="brutalist-border p-4 text-center mb-6 bg-white">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader size="lg" />
                <h3 className="text-lg font-bold mb-2">
                  {!isOpenCVReady ? t('loading.tool') : t('loading.proStatus')}
                </h3>
                <p className="text-sm text-gray-600">
                  {!isOpenCVReady ? t('loading.description') : t('loading.proDescription')}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card 
                  title={t('mainCard.title')}
                  variant="accent"
                  headerRight={
                    isProUser ? <ProBadge className="ml-2" /> : null
                  }
                >
                  <div className="space-y-6">
                    {/* Info Section */}
                    <div className="brutalist-border p-4 bg-white">
                      <h3 className="font-bold mb-2">{t('mainCard.info.title')}</h3>
                      <p className="text-sm mb-2">
                        {t('mainCard.info.description')}
                      </p>
                      
                      {!isProUser && !isProLoading && (
                        <div className="bg-yellow-50 p-3 mb-2 brutalist-border">
                          <p className="text-sm font-bold flex items-center">
                            {t('mainCard.info.freeMode.title')}
                          </p>
                          <p className="text-xs">
                            {t('mainCard.info.freeMode.description')}
                          </p>
                        </div>
                      )}
                      
                      {isProUser && (
                        <div className="bg-yellow-50 p-3 mb-2 brutalist-border">
                          <p className="text-sm font-bold flex items-center">
                            {t('mainCard.info.proMode.title')} <ProBadge className="ml-2" />
                          </p>
                          <p className="text-xs">
                            {t('mainCard.info.proMode.description')}
                          </p>
                        </div>
                      )}
                    </div>
                  
                    {/* Upload and Process Area */}
                    <div className="brutalist-border p-6 bg-white">
                      <div className="space-y-4">
                        {images.length === 0 ? (
                          <div className="text-center">
                            <p className="text-lg font-bold mb-4">{t('mainCard.upload.title')}</p>
                            <input
                              type="file"
                              accept="image/*"
                              multiple={isProUser}
                              onChange={handleFileChange}
                              className="hidden"
                              id="fileInput"
                              disabled={isProcessing || isRemovingBackground}
                            />
                            <div className="flex flex-col items-center gap-2 space-y-6">
                              <label htmlFor="fileInput" className="inline-block">
                                <Button as="span" variant="primary" size="lg" disabled={isProcessing || isRemovingBackground}>
                                  {isProUser ? t('mainCard.upload.buttonPro') : t('mainCard.upload.buttonFree')}
                                </Button>
                              </label>
                              
                              <span className="text-xs text-gray-600">
                                {isProUser ? t('mainCard.upload.helpTextPro') : t('mainCard.upload.helpTextFree')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {images.map(image => (
                                <div key={image.id} className="brutalist-border p-1 bg-white">
                                  {image.backgroundRemoved ? (
                                    <div 
                                      className="bg-[url('/checkered-bg.png')] bg-repeat"
                                      style={{ aspectRatio: '1/1' }}
                                    >
                                      <img 
                                        src={image.thumbnailDataUrl || image.dataUrl} 
                                        alt={image.file.name}
                                        className="w-full h-auto object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <img 
                                      src={image.thumbnailDataUrl || image.dataUrl} 
                                      alt={image.file.name}
                                      className="w-full h-auto object-contain"
                                      style={{ aspectRatio: '1/1' }}
                                    />
                                  )}
                                  <p className="text-xs truncate mt-1 px-1">{image.file.name}</p>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex justify-between">
                              <Button 
                                variant="secondary" 
                                onClick={() => setImages([])}
                                disabled={isProcessing || isRemovingBackground}
                              >
                                {t('mainCard.actions.clear')}
                              </Button>
                              
                              {images.some(img => img.backgroundRemoved) ? (
                                <Button 
                                  variant="accent" 
                                  onClick={handleDownload}
                                  disabled={isProcessing || isRemovingBackground}
                                >
                                  {t(images.length > 1 ? 'mainCard.actions.downloadZip' : 'mainCard.actions.download')}
                                </Button>
                              ) : (
                                <Button 
                                  variant="accent" 
                                  onClick={handleRemoveBackground}
                                  disabled={isProcessing || isRemovingBackground}
                                >
                                  {isRemovingBackground 
                                    ? t(images.length > 1 ? 'mainCard.actions.processingMultiple' : 'mainCard.actions.processing')
                                    : t(images.length > 1 ? 'mainCard.actions.removeBackgrounds' : 'mainCard.actions.removeBackground')
                                  }
                                </Button>
                              )}
                            </div>
                            
                            {isRemovingBackground && (
                              <div className="space-y-2">
                                <div className="w-full h-3 brutalist-border bg-white overflow-hidden">
                                  <div 
                                    className="h-full bg-[#4F46E5]"
                                    style={{ width: `${progressPercent}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>{t('mainCard.progress.processing')}</span>
                                  <span>{t('mainCard.progress.percent', { percent: progressPercent })}</span>
                                </div>
                              </div>
                            )}
                            
                            {images.some(img => img.backgroundRemoved) && (
                              <div className="mt-6">
                                <Button 
                                  variant="default" 
                                  onClick={handleTryMain}
                                  fullWidth
                                >
                                  {t('mainCard.actions.tryFullEditor')}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              
              <div className="space-y-6">
                {!isProUser && !isProLoading && (
                  <Card title={t('mainCard.upgradeCard.title')} variant="accent">
                    <div className="space-y-4">
                      <PricingCard
                        title={t('mainCard.upgradeCard.plan.title')}
                        price={t('mainCard.upgradeCard.plan.price')}
                        isPro={true}
                        features={[
                          t('mainCard.upgradeCard.plan.features.0'),
                          t('mainCard.upgradeCard.plan.features.1'),
                          t('mainCard.upgradeCard.plan.features.2'),
                          t('mainCard.upgradeCard.plan.features.3'),
                          t('mainCard.upgradeCard.plan.features.4')
                        ]}
                        buttonText={t('mainCard.upgradeCard.plan.buttonText')}
                        onSelectPlan={() => router.push('/pricing')}
                      />
                    </div>
                  </Card>
                )}
                
                <Card title={t('howItWorks.title')} variant="accent">
                  <div className="space-y-4">
                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">{t('howItWorks.step1.title')}</h3>
                      <p className="text-sm">
                        {t('howItWorks.step1.description')}
                        {isProUser ? ` ${t('howItWorks.step1.proNote')}` : ''}
                      </p>
                    </div>
                    
                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">{t('howItWorks.step2.title')}</h3>
                      <p className="text-sm">{t('howItWorks.step2.description')}</p>
                    </div>
                    
                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">{t('howItWorks.step3.title')}</h3>
                      <p className="text-sm">{t('howItWorks.step3.description')}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
        
        {/* Pro Upgrade Dialog */}
        {showProUpgrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white brutalist-border border-3 border-black p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{t('proDialog.title')}</h3>
                <button onClick={() => setShowProUpgrade(false)} className="text-gray-500 hover:text-gray-700">
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
                
                <p className="mb-4 text-sm">{t('proDialog.description')}</p>
                
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
                  onClick={() => {
                    setShowProUpgrade(false);
                    // Process only the first image for free users
                    setImages([images[0]]);
                  }}
                  className="w-full"
                >
                  {t('proDialog.actions.continue')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
} 