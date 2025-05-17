'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useIsPro } from '../../hooks/useIsPro';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ProBadge from '../../components/ProBadge';
import PricingCard from '../../components/PricingCard';
import { ImageFile } from '../../components/ImagePreview';
import { createImageFile, downloadAllImages, downloadImage, ImageFormat } from '../../lib/imageProcessing';
import { initOpenCV } from '../../lib/imageProcessing';
import Loader from '../../components/Loader';
import { useTranslations } from 'next-intl';
import PresetsSelector, { Preset, defaultPresets } from '../../components/PresetsSelector';
import { convertImageFormat, supportedOutputFormats, isHeicFormat, convertHeicToFormat } from '../../utils/imageFormatConverter';
import DownloadDialog from '../../components/DownloadDialog';
import ProUpgradeDialog from '../../components/ProUpgradeDialog';

// Extend ImageFile type to include format conversion properties
interface FormatConversionImageFile extends ImageFile {
  originalFormat?: string;
  targetFormat?: string;
}

export default function ImageFormatConvertorPage() {
  const t = useTranslations('ImageFormatConvertorPage');
  const tHome = useTranslations('Home');

  const { isProUser, isLoading: isProLoading } = useIsPro();
  const router = useRouter();
  const [images, setImages] = useState<FormatConversionImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('jpg');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPresetSettings, setCustomPresetSettings] = useState<Preset | null>(null);
  const [convertedImages, setConvertedImages] = useState<FormatConversionImageFile[]>([]);
  const [processingErrors, setProcessingErrors] = useState<string[]>([]);
  
  // Download dialog state
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<ImageFormat>('jpg');

  // Calculate max images based on pro status
  const MAX_IMAGES = isProUser ? 100 : 5;

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

  // Handle custom preset settings
  const handleCustomSettingsChange = (settings: { width: number; height: number | null; quality: number }) => {
    // Create a custom preset
    const updatedCustomPreset: Preset = {
      id: 'custom',
      name: 'Custom',
      width: settings.width,
      height: settings.height,
      quality: settings.quality,
      description: `Custom ${settings.width}x${settings.height || 'auto'} @ ${settings.quality}%`
    };
    
    // Update the custom preset in the presets list
    setCustomPresetSettings(updatedCustomPreset);
  };

  // Get current preset details
  const getCurrentPreset = (): Preset | null => {
    if (!selectedPreset) return null;
    
    if (selectedPreset === 'custom' && customPresetSettings) {
      return customPresetSettings;
    }
    
    return defaultPresets.find(p => p.id === selectedPreset) || null;
  };

  // Get current preset name for display
  const getCurrentPresetName = (): string | undefined => {
    const preset = getCurrentPreset();
    return preset?.name;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // Set processing state immediately
    setIsProcessing(true);

    // Get the original file array
    const originalFileArray = Array.from(e.target.files);
    
    // Reset errors
    setProcessingErrors([]);
    
    // Enforce the max images limit for non-pro users
    let fileArray = originalFileArray;
    if (!isProUser && !isProLoading) {
      // Check total images (current + new) against max
      if (images.length + fileArray.length > MAX_IMAGES) {
        // Only take what we can add
        fileArray = fileArray.slice(0, MAX_IMAGES - images.length);
        // Show pro upgrade dialog
        setShowProUpgrade(true);
      }
    } else if (images.length + fileArray.length > 100) {
      // Still enforce max 100 total for pro users
      fileArray = fileArray.slice(0, 100 - images.length);
    }
    
    try {
      // Process files with HEIC handling first
      const processedFilesResults = await Promise.allSettled(fileArray.map(async (file) => {
        try {
          // Check if file is HEIC/HEIF format
          const isHeic = await isHeicFormat(file);
          
          if (isHeic) {
            // Convert HEIC to PNG first
            const convertedFile = await convertHeicToFormat(file, 'png');
            if (convertedFile) {
              console.log('HEIC conversion complete:', convertedFile.name);
              return convertedFile;
            } else {
              setProcessingErrors(prev => [...prev, `Could not convert HEIC file: ${file.name}`]);
              return null;
            }
          }
          
          // Return original file for non-HEIC formats
          return file;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          setProcessingErrors(prev => [...prev, `Could not process ${file.name}: ${(error as Error).message || 'Unknown error'}`]);
          return null;
        }
      }));
      
      // Filter out failed conversions
      const processedFiles = processedFilesResults
        .filter((result): result is PromiseFulfilledResult<File | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as File);
      
      // Create image files from processed files
      const newImagesResults = await Promise.allSettled(processedFiles.map(async (file) => {
        try {
          return await createImageFile(file);
        } catch (error) {
          console.error(`Error creating image file for ${file.name}:`, error);
          setProcessingErrors(prev => [...prev, `Could not create image for ${file.name}: ${(error as Error).message || 'Unknown error'}`]);
          return null;
        }
      }));
      
      // Filter out rejected promises and nulls
      const newImages = newImagesResults
        .filter((result): result is PromiseFulfilledResult<ImageFile> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => {
          const image = result.value as FormatConversionImageFile;
          // Store original format information
          image.originalFormat = image.file.type.split('/')[1] || 'unknown';
          return image;
        });
      
      // APPEND the images rather than replacing
      setImages(currentImages => [...currentImages, ...newImages]);
      
      // Show upgrade message if user tried to upload more than MAX_IMAGES
      if (!isProUser && images.length + originalFileArray.length > MAX_IMAGES) {
        // We don't use full dialog for this, just a message
        console.log('User tried to upload more than allowed as free user');
      }
    } catch (error) {
      console.error('Error processing uploaded files', error);
      setProcessingErrors(prev => [...prev, `Failed to process files: ${(error as Error).message || 'Unknown error'}`]);
    } finally {
      // Add a small delay before removing the processing state
      // This ensures the UI has time to update and show the loading state
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  };

  const handleConvertImages = async () => {
    if (images.length === 0) return;
    
    // For free users, enforce MAX_IMAGES limit again
    if (!isProUser && !isProLoading && images.length > MAX_IMAGES) {
      setShowProUpgrade(true);
      return;
    }
    
    setIsConverting(true);
    setProcessingErrors([]);
    setDownloadFormat(selectedFormat as ImageFormat);
    
    try {
      // Get the current preset for resizing
      const currentPreset = getCurrentPreset();
      const quality = currentPreset?.quality || 95;
      
      // Process each image to convert format
      const converted: FormatConversionImageFile[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Update progress percentage
        setProgressPercent(Math.round((i / images.length) * 100));
        
        try {
          // Convert image format
          const convertedFile = await convertImageFormat(image.file, selectedFormat, quality);
          
          if (convertedFile) {
            // Create a new image file with the converted data
            const convertedImageFile = await createImageFile(convertedFile);
            
            // Add to converted images with format info
            converted.push({
              ...convertedImageFile,
              originalFormat: image.originalFormat || image.file.type.split('/')[1] || 'unknown',
              targetFormat: selectedFormat
            } as FormatConversionImageFile);
          } else {
            console.error(`Failed to convert image: ${image.file.name}`);
            setProcessingErrors(prev => [...prev, `Failed to convert ${image.file.name}`]);
          }
        } catch (error) {
          console.error(`Error converting image ${image.file.name}:`, error);
          setProcessingErrors(prev => [...prev, `Error converting ${image.file.name}: ${(error as Error).message || 'Unknown error'}`]);
        }
      }
      
      setProgressPercent(100);
      setConvertedImages(converted); // Store converted images
      
      // Show download dialog instead of converted images preview
      setIsDownloadDialogOpen(true);
      
    } catch (error) {
      console.error('Error in format conversion:', error);
      setProcessingErrors(prev => [...prev, `Conversion failed: ${(error as Error).message || 'Unknown error'}`]);
      alert(t('alerts.conversionFailed'));
    } finally {
      setIsConverting(false);
    }
  };

  const handleConfirmDownload = async () => {
    setIsDownloading(true);
    
    try {
      // Use existing downloadAllImages function with ZIP for multiple images
      if (convertedImages.length > 1) {
        await downloadAllImages(convertedImages, selectedFormat as ImageFormat, true);
      } else if (convertedImages.length === 1) {
        // For a single image, just download directly
        const image = convertedImages[0];
        if (image.dataUrl) {
          await downloadImage(image.dataUrl, image.file.name, selectedFormat as ImageFormat);
        }
      }
      
      setDownloadComplete(true);
    } catch (error) {
      console.error('Download error:', error);
      alert(t('alerts.downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Handle starting a new bundle after download
  const handleStartNewBundle = () => {
    setImages([]);
    setConvertedImages([]);
    setSelectedPreset(null);
    setCustomPresetSettings(null);
    setProcessingErrors([]);
    setIsDownloadDialogOpen(false);
    setDownloadComplete(false);
  };

  // Handle continuing with editing after download
  const handleContinueEditing = () => {
    setIsDownloadDialogOpen(false);
    setDownloadComplete(false);
  };
  
  // Get all presets including custom preset if available
  const getAllPresets = () => {
    let presets = [...defaultPresets];
    
    if (customPresetSettings) {
      // Replace existing custom preset or add new one
      const customIndex = presets.findIndex(p => p.id === 'custom');
      if (customIndex >= 0) {
        presets[customIndex] = customPresetSettings;
      } else {
        presets = [...presets, customPresetSettings];
      }
    }
    
    return presets;
  };

  // Get appropriate button text for conversion
  const getConvertButtonText = () => {
    if (isConverting) {
      return images.length > 1 
        ? t('mainCard.actions.convertingMultiple') 
        : t('mainCard.actions.converting');
    } else {
      return images.length > 1 
        ? t('mainCard.actions.convertImagesTo', { format: selectedFormat.toUpperCase() }) 
        : t('mainCard.actions.convertImageTo', { format: selectedFormat.toUpperCase() });
    }
  };

  return (
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
            <div className="md:col-span-2 space-y-6">
              {/* Main card with image selection */}
              <Card 
                collapsible={false}
                title={t('mainCard.title')}
                variant="accent"
                headerRight={
                  isProUser ? <ProBadge className="ml-2" /> : null
                }
              >
                <div className="space-y-6 relative">
                  {/* Main loading overlay for the entire card */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-30 rounded-md backdrop-blur-sm">
                      <Loader size="lg" />
                      <p className="mt-4 text-lg font-bold text-gray-700">{tHome('preparingImagesPreview')}</p>
                    </div>
                  )}
                  
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
                          {t('mainCard.info.freeMode.description', { maxImages: MAX_IMAGES })}
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
                  
                  {/* Upload Area - Use same logic as background-removal/page.tsx */}
                  {images.length === 0 ? (
                    <div className="brutalist-border p-6 bg-white">
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-lg font-bold mb-4">{t('mainCard.upload.title')}</p>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            id="fileInput"
                            disabled={isProcessing || isConverting}
                          />
                          <div className="flex flex-col items-center gap-2 space-y-6 relative">
                        
                            <label htmlFor="fileInput" className="inline-block">
                              <Button as="span" variant="primary" size="lg" disabled={isProcessing || isConverting}>
                                {isProUser ? t('mainCard.upload.buttonPro') : t('mainCard.upload.buttonFree')}
                              </Button>
                            </label>
                            <span className="text-xs text-gray-600">
                              {isProUser ? t('mainCard.upload.helpTextPro') : t('mainCard.upload.helpTextFree', { maxImages: MAX_IMAGES })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Format Selection */}
                      <div className="brutalist-border p-4 bg-white">
                        <h3 className="font-bold mb-3">{t('targetFormat.title')}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          {supportedOutputFormats.map(format => (
                            <Button
                              key={format.id}
                              variant={selectedFormat === format.id ? 'accent' : 'primary'}
                              onClick={() => setSelectedFormat(format.id)}
                            >
                              {format.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Resize Options */}
                      <div className="brutalist-border p-4 bg-white">
                        <h3 className="font-bold mb-3">{t('resize.title')}</h3>
                        <PresetsSelector 
                          presets={getAllPresets()}
                          selectedPreset={selectedPreset}
                          onSelectPreset={setSelectedPreset}
                          onCustomSettingsChange={handleCustomSettingsChange}
                        />
                      </div>

                      {/* Image preview and controls */}
                      <div className="brutalist-border p-4 bg-white">
                        <div className="mb-4 flex justify-between items-center">
                          <h3 className="font-bold">{t('selectedImages.title', { count: images.length })}</h3>
                          
                          <div className="flex gap-2 items-center">
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => {
                                setImages([]);
                                setConvertedImages([]);
                              }}
                              disabled={isProcessing || isConverting}
                            >
                              {t('mainCard.actions.clear')}
                            </Button>
                            
                            {!isProUser && images.length >= MAX_IMAGES ? (
                              <Button 
                                variant="accent"
                                size="sm"
                                onClick={() => setShowProUpgrade(true)}
                              >
                                {t('proDialog.title')}
                              </Button>
                            ) : (
                              <input
                                type="file"
                                accept="image/*"
                                multiple={true}
                                onChange={handleFileChange}
                                className="hidden"
                                id="fileInputMore"
                                disabled={isProcessing || isConverting || (images.length >= MAX_IMAGES && !isProUser) || images.length >= 100}
                              />
                            )}
                            <label htmlFor="fileInputMore">
                              <Button 
                                as="span" 
                                variant="secondary"
                                size="sm"
                                disabled={isProcessing || isConverting || (images.length >= MAX_IMAGES && !isProUser) || images.length >= 100}
                              >
                                {t('mainCard.actions.addMore')}
                              </Button>
                            </label>
                          </div>
                        </div>
                        
                        {/* Image count - styled like ImagePreview.tsx */}
                        <div className="mb-3 flex justify-between items-center">
                          <h3 className="font-bold text-lg uppercase">
                            {t('allImages', { current: images.length, max: MAX_IMAGES })}
                          </h3>
                          
                          <div className="text-sm">
                            {t('imagesCount', { current: images.length, max: MAX_IMAGES })}
                            {!isProUser && images.length >= MAX_IMAGES && (
                              <span className="ml-2 text-xs text-gray-600">
                                {t('upgradeFor')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                                                  {/* Image grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 relative">
                
                          
                          {images.map((image, index) => (
                            <div key={image.id} className="brutalist-border p-2 cursor-pointer transition-transform hover:translate-y-[-2px]">
                              <div className="relative aspect-square w-full overflow-hidden">
                                <Image
                                  src={image.thumbnailDataUrl || image.dataUrl || ''}
                                  alt={image.file.name}
                                  className="object-contain"
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                  onError={() => {
                                    console.error(`Error loading image: ${image.file.name}`);
                                    setProcessingErrors(prev => [...prev, `Failed to display ${image.file.name}`]);
                                  }}
                                />
                                {/* Image number indicator - like in ImagePreview.tsx */}
                                <div className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded-sm z-10">
                                  {index + 1}/{images.length}
                                </div>
                                {/* Delete button - like in ImagePreview.tsx */}
                                <button 
                                  onClick={() => {
                                    setImages(prev => prev.filter(img => img.id !== image.id));
                                  }}
                                  className="absolute top-1 right-1 brutalist-border border-2 border-black bg-accent text-black text-xs px-2 py-1 shadow-brutalist hover:translate-y-[-2px] transition-transform z-10"
                                  disabled={isProcessing || isConverting}
                                >
                                  ×
                                </button>
                              </div>
                              <div className="mt-2 text-xs truncate">
                                {image.file.name}
                              </div>
                              {/* Display format type for better user feedback */}
                              {image.originalFormat && (
                                <div className="text-[10px] text-gray-500">
                                  Format: {image.originalFormat.toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Error messages */}
                        {processingErrors.length > 0 && (
                          <div className="brutalist-border p-3 bg-red-50 mt-4 mb-4">
                            <p className="text-sm font-bold text-red-600 mb-1">Processing Errors:</p>
                            <ul className="text-xs text-red-600 list-disc pl-5">
                              {processingErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Convert button - centered and larger */}
                        <div className="flex justify-center mt-6">
                          <Button 
                            variant="accent" 
                            size="lg"
                            onClick={handleConvertImages}
                            disabled={isProcessing || isConverting || images.length === 0}
                            className="w-full md:w-auto"
                          >
                            {getConvertButtonText()}
                          </Button>
                        </div>
                        
                        {/* Conversion progress */}
                        {isConverting && (
                          <div className="space-y-2 mt-4">
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
                      </div>
                    </>
                  )}
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
                  
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">{t('howItWorks.step4.title')}</h3>
                    <p className="text-sm">{t('howItWorks.step4.description')}</p>
                  </div>
                </div>
              </Card>
              
              <Card title={t('supportedFormats.title')} variant="accent">
                <div className="brutalist-border p-3 bg-white">
                  <h3 className="font-bold mb-2">{t('supportedFormats.input.title')}</h3>
                  <p className="text-sm">{t('supportedFormats.input.description')}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="brutalist-border p-2 bg-gray-50">
                      <p className="text-xs font-bold">JPG/JPEG</p>
                    </div>
                    <div className="brutalist-border p-2 bg-gray-50">
                      <p className="text-xs font-bold">PNG</p>
                    </div>
                    <div className="brutalist-border p-2 bg-gray-50">
                      <p className="text-xs font-bold">WebP</p>
                    </div>
                    <div className="brutalist-border p-2 bg-gray-50">
                      <p className="text-xs font-bold">HEIC/HEIF</p>
                    </div>
                    <div className="brutalist-border p-2 bg-gray-50">
                      <p className="text-xs font-bold">BMP</p>
                    </div>
                    <div className="brutalist-border p-2 bg-gray-50">
                      <p className="text-xs font-bold">GIF (static)</p>
                    </div>
                  </div>
                </div>
                
                <div className="brutalist-border p-3 bg-white mt-3">
                  <h3 className="font-bold mb-2">{t('supportedFormats.output.title')}</h3>
                  <p className="text-sm">{t('supportedFormats.output.description')}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {supportedOutputFormats.map(format => (
                      <div key={format.id} className="brutalist-border p-2 bg-gray-50">
                        <p className="text-xs font-bold">{format.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
      
      {/* Pro Upgrade Dialog */}
      <ProUpgradeDialog
        isOpen={showProUpgrade}
        onClose={() => setShowProUpgrade(false)}
        title={t('proDialog.title')}
        feature={t('proDialog.featureTitle')}
        maxImagesCount={MAX_IMAGES}
      />
      
      {/* Download Dialog - Similar to DownloadDialog.tsx */}
      <DownloadDialog
        isOpen={isDownloadDialogOpen}
        onClose={downloadComplete ? handleContinueEditing : handleConfirmDownload}
        imageCount={convertedImages.length}
        onStartNewBundle={handleStartNewBundle}
        onContinueEditing={handleContinueEditing}
        hasAppliedChanges={true}
        appliedPresetName={getCurrentPresetName()}
        isDownloading={isDownloading}
        downloadComplete={downloadComplete}
        formatType={downloadFormat}
        hasSeoNames={false}
        hasWatermark={false}
      />
    </main>
  );
} 