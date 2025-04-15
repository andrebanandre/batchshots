'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Card from '../components/Card';
import Button from '../components/Button';
import ImagePreview, { ImageFile } from '../components/ImagePreview';
import ImageProcessingControls, { ImageAdjustments, defaultAdjustments } from '../components/ImageProcessingControls';
import PresetsSelector, { defaultPresets, Preset } from '../components/PresetsSelector';
import DownloadOptions, { ImageFormat } from '../components/DownloadOptions';
import DownloadDialog from '../components/DownloadDialog';
import SeoNameGenerator, { SeoImageName } from '../components/SeoNameGenerator';
import SeoProductDescriptionGenerator from '../components/SeoProductDescriptionGenerator';
import { useIsPro } from '../hooks/useIsPro';
import { useRouter } from 'next/navigation';
import { 
  processImageBackground, 
  getUpdatedImageWithBackground
} from '../lib/backgroundRemoval';
import { 
  initOpenCV, 
  processImage, 
  createImageFile, 
  downloadAllImages,
  downloadImage,
  ImageFormat as LibImageFormat
} from '../lib/imageProcessing';
import Loader from '../components/Loader';
import { ImageProcessingProvider } from '../contexts/ImageProcessingContext';
import ProUpgradeDialog from '../components/ProUpgradeDialog';
import ProBadge from '../components/ProBadge';
import { SeoProductDescription } from '../lib/gemini';

export default function Home() {
  const t = useTranslations('Home');
  const tDialogs = useTranslations('Dialogs');
  const locale = useLocale();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPresetSettings, setCustomPresetSettings] = useState<Preset | null>(null);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);
  const { isProUser } = useIsPro();
  const router = useRouter();
  
  // Calculate max images based on pro status
  const MAX_IMAGES = isProUser ? 100 : 5;
  
  // Show upgrade dialog
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Download dialog state
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<LibImageFormat>('jpg');
  
  // SEO name generation state
  const [seoNames, setSeoNames] = useState<SeoImageName[]>([]);
  const [isGeneratingSeoNames, setIsGeneratingSeoNames] = useState(false);
  
  // SEO product description state
  const [seoProductDescription, setSeoProductDescription] = useState<SeoProductDescription | null>(null);

  // Background removal state
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState({ processed: 0, total: 0 });

  // Initialize OpenCV.js
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

  // Real-time preview processing with adjustments
  useEffect(() => {
    const applyPreviewAdjustments = async () => {
      if (!isOpenCVReady || images.length === 0) return;

      // Set processing state to true
      setIsProcessing(true);
      
      console.log("Applying preview adjustments:", {
        adjustments,
        selectedImageId,
        applyToAll,
        hasImages: images.length > 0
      });

      try {
        const currentPreset = getCurrentPreset();
        
        // Use the current images from state closure
        const imagesToProcess = [...images];
        const updatedImages = await Promise.all(
          imagesToProcess.map(async (image) => {
            // Only update the selected image (or all images if applyToAll is true)
            if ((selectedImageId && image.id === selectedImageId) || applyToAll) {
              console.log(`Processing image ${image.id} with RGB scales:`, {
                redScale: adjustments.redScale,
                greenScale: adjustments.greenScale,
                blueScale: adjustments.blueScale
              });
              
              // Process only thumbnails for preview - much faster
              const { processedThumbnailUrl } = await processImage(image, adjustments, currentPreset, false);
              
              // Add debug log for background-removed images
              if (image.backgroundRemoved) {
                console.log('Processing background-removed thumbnail for preview:', image.id);
              }
              
              return {
                ...image,
                processedThumbnailUrl,
                // Store the applied preset information
                appliedPreset: currentPreset ? {
                  name: currentPreset.name,
                  width: currentPreset.width,
                  height: currentPreset.height,
                  quality: currentPreset.quality
                } : undefined
              };
            }
            return image;
          })
        );
        
        setImages(updatedImages);
        console.log("Preview processing complete, images updated");
      } catch (error) {
        console.error('Error applying preview adjustments', error);
      } finally {
        // Set processing state to false when done
        setIsProcessing(false);
      }
    };

    const timeoutId = setTimeout(() => {
      applyPreviewAdjustments();
    }, 200); // Debounce

    return () => clearTimeout(timeoutId);
  }, [adjustments, isOpenCVReady, selectedImageId, selectedPreset, applyToAll, customPresetSettings]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const fileArray = Array.from(e.target.files);
    
    try {
      setIsProcessing(true);
      const newImages = await Promise.all(fileArray.map(createImageFile));
      
      // Check total images against limit
      const totalImages = [...images, ...newImages];
      if (totalImages.length > MAX_IMAGES) {
        // For pro users, just limit the number of images
        if (isProUser) {
          alert(`Maximum ${MAX_IMAGES} images allowed. Only the first ${MAX_IMAGES - images.length} images will be added.`);
          const limitedNewImages = newImages.slice(0, MAX_IMAGES - images.length);
          setImages([...images, ...limitedNewImages]);
          
          // Select the first image if none is selected
          if (!selectedImageId && limitedNewImages.length > 0) {
            setSelectedImageId(limitedNewImages[0].id);
          }
        } 
        // For free users, show the upgrade dialog if they try to add more than the limit
        else {
          const limitedNewImages = newImages.slice(0, MAX_IMAGES - images.length);
          setImages([...images, ...limitedNewImages]);
          
          // Select the first image if none is selected
          if (!selectedImageId && limitedNewImages.length > 0) {
            setSelectedImageId(limitedNewImages[0].id);
          }
          
          // Show dialog for upgrade if user hit the limit with this upload
          if (images.length === 0 && newImages.length > MAX_IMAGES) {
            setShowUpgradeDialog(true);
          }
        }
      } else {
        setImages(totalImages);
        
        // Select the first image if none is selected
        if (!selectedImageId && newImages.length > 0) {
          setSelectedImageId(newImages[0].id);
        }
      }
    } catch (error) {
      console.error('Error processing uploaded files', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle deleting an image
  const handleDeleteImage = (imageId: string) => {
    // Remove the image from the state
    const updatedImages = images.filter(img => img.id !== imageId);
    setImages(updatedImages);
    
    // Remove from SEO names list if present
    setSeoNames(prevSeoNames => prevSeoNames.filter(name => name.id !== imageId));
    
    // If the deleted image was selected, select another one if available
    if (selectedImageId === imageId) {
      if (updatedImages.length > 0) {
        setSelectedImageId(updatedImages[0].id);
      } else {
        setSelectedImageId(null);
      }
    }
  };

  // Handle download - process the full image if needed
  const handleDownloadImage = async (image: ImageFile, format: LibImageFormat = 'jpg') => {
    console.log("Download requested for image:", image.id, "with adjustments:", adjustments);
    
    // For background-removed images with processing applied
    if (image.backgroundRemoved && image.processedDataUrl) {
      console.log("Using existing processed data URL for background-removed image");
      downloadImage(image.processedDataUrl, image.file.name, 'png', image.seoName);
      return;
    }
    // For background-removed images without specific processing, use dataUrl directly
    // This ensures we use the transparent PNG even if there's no processed version
    else if (image.backgroundRemoved && image.dataUrl) {
      console.log("Using original data URL for background-removed image");
      downloadImage(image.dataUrl, image.file.name, 'png', image.seoName, adjustments);
      return;
    }
    // For background-removed images that need specific processing, process now
    else if (image.backgroundRemoved) {
      setIsProcessing(true);
      try {
        console.log("Processing background-removed image for download with adjustments:", {
          redScale: adjustments.redScale,
          greenScale: adjustments.greenScale,
          blueScale: adjustments.blueScale
        });
        
        const currentPreset = getCurrentPreset();
        const { processedDataUrl } = await processImage(image, adjustments, currentPreset, true);
        
        if (processedDataUrl) {
          // Update the image in state with the processed version
          setImages(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { 
                    ...img, 
                    processedDataUrl,
                    // Store the applied preset information
                    appliedPreset: currentPreset ? {
                      name: currentPreset.name,
                      width: currentPreset.width,
                      height: currentPreset.height,
                      quality: currentPreset.quality
                    } : undefined
                  }
                : img
            )
          );
          
          // Download the processed image with adjustments
          downloadImage(processedDataUrl, image.file.name, 'png', image.seoName);
        }
      } catch (error) {
        console.error('Error processing transparent image', error);
        // Fallback to original
        downloadImage(image.dataUrl, image.file.name, 'png', image.seoName, adjustments);
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    if (image.processedDataUrl) {
      // If we already have the processed full image, download it
      console.log("Using existing processed data URL for regular image");
      downloadImage(image.processedDataUrl, `processed_${image.file.name}`, format, image.seoName);
    } else if (image.processedThumbnailUrl) {
      // Process the full-size image now
      setIsProcessing(true);
      try {
        console.log("Processing regular image for download with adjustments:", {
          redScale: adjustments.redScale,
          greenScale: adjustments.greenScale,
          blueScale: adjustments.blueScale
        });
        
        const currentPreset = getCurrentPreset();
          
        const { processedDataUrl } = await processImage(image, adjustments, currentPreset, true);
        
        if (processedDataUrl) {
          // Update the image in state with the full processed version
          setImages(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { 
                    ...img, 
                    processedDataUrl,
                    // Store the applied preset information
                    appliedPreset: currentPreset ? {
                      name: currentPreset.name,
                      width: currentPreset.width,
                      height: currentPreset.height,
                      quality: currentPreset.quality
                    } : undefined
                  }
                : img
            )
          );
          
          // Download the processed image
          downloadImage(processedDataUrl, `processed_${image.file.name}`, format, image.seoName);
        }
      } catch (error) {
        console.error('Error processing full image for download', error);
        // Download the original with adjustments
        downloadImage(image.dataUrl, image.file.name, format, image.seoName, adjustments);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Download the original if no processing has been done, but still apply adjustments
      downloadImage(image.dataUrl, image.file.name, format, image.seoName, adjustments);
    }
  };

  const handleInitiateDownload = (format: ImageFormat) => {
    // Use the format chosen by the user
    const selectedFormat = format as LibImageFormat;
    
    setDownloadFormat(selectedFormat);
    setDownloadComplete(false);
    setIsDownloadDialogOpen(true);
  };

  const handleConfirmDownload = async () => {
    setIsDownloading(true);
    await handleDownloadAll(downloadFormat);
    setIsDownloading(false);
    setDownloadComplete(true);
  };

  const handleDownloadAll = async (format: LibImageFormat = 'jpg') => {
    // Include both processed images and those with background removed
    const processedImages = images.filter(img => img.processedThumbnailUrl || img.backgroundRemoved);
    if (processedImages.length === 0) return;
    
    setIsProcessing(true);
    try {
      const currentPreset = getCurrentPreset();
      
      // Process full-size versions of all images before download
      const fullyProcessedImages = await Promise.all(
        images.map(async (image) => {
          // Only process images that need processing (either selected or all if applyToAll is true)
          if (selectedImageId === image.id || applyToAll) {
            // Process all images, including those with background removed
            const { processedThumbnailUrl, processedDataUrl } = 
              await processImage(image, adjustments, currentPreset, true);
            
            return {
              ...image,
              processedThumbnailUrl,
              processedDataUrl,
              appliedPreset: currentPreset ? {
                name: currentPreset.name,
                width: currentPreset.width,
                height: currentPreset.height,
                quality: currentPreset.quality
              } : undefined
            };
          }
          return image;
        })
      );
      
      // Update state with processed images
      setImages(fullyProcessedImages);
      
      // Download all the processed images and images with background removed
      const updatedImages = fullyProcessedImages.filter(img => img.processedDataUrl || img.backgroundRemoved);
      
      // Include SEO product description if available
      downloadAllImages(updatedImages, format, true, seoProductDescription, adjustments);
    } catch (error) {
      console.error('Error processing images for download', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate SEO-friendly names for images
  const handleGenerateSeoNames = async (description: string, recaptchaToken: string, imageCount: number) => {
    if (!description.trim() || images.length === 0) return;
    
    setIsGeneratingSeoNames(true);
    
    try {
      console.log(`[Client] Generating SEO names in language: ${locale}`);
      
      // Call the API endpoint to generate SEO names
      const response = await fetch('/api/seo-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          description, 
          recaptchaToken,
          imageCount: imageCount || images.length, // Use provided count or fall back to total images
          language: locale // Pass the current locale to the API
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate SEO names');
      }
      
      const data = await response.json();
      const { seoNames: generatedSeoNames } = data;
      
      if (!generatedSeoNames || !Array.isArray(generatedSeoNames)) {
        throw new Error('Invalid response from SEO names API');
      }
      
      // Map the generated SEO names to images
      const newSeoNames: SeoImageName[] = images.map((image, index) => {
        // Use a generated name if available, otherwise create a default one
        const seoName = index < generatedSeoNames.length 
          ? generatedSeoNames[index] 
          : `product-${index + 1}`;
          
        return {
          id: image.id,
          originalName: image.file.name,
          seoName: seoName,
          description,
          extension: image.file.name.split('.').pop() || 'jpg'
        };
      });
      
      setSeoNames(newSeoNames);
      
      // Update the images with the SEO names
      setImages(prevImages => 
        prevImages.map(image => {
          const seoNameData = newSeoNames.find(seo => seo.id === image.id);
          if (seoNameData) {
            return {
              ...image,
              seoName: seoNameData.seoName,
              originalName: image.file.name
            };
          }
          return image;
        })
      );
      
    } catch (error) {
      console.error('Error generating SEO names:', error);
      alert('Failed to generate SEO names. Please try again.');
    } finally {
      setIsGeneratingSeoNames(false);
    }
  };
  
  // Handle reset of all adjustments
  const handleReset = () => {
    // Reset adjustments to default values
    setAdjustments(defaultAdjustments);
    
    // Reset preset selection
    setSelectedPreset(null);
    setCustomPresetSettings(null);
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

  // Handle starting a new bundle after download
  const handleStartNewBundle = () => {
    setImages([]);
    setSelectedImageId(null);
    setAdjustments(defaultAdjustments);
    setSelectedPreset(null);
    setCustomPresetSettings(null);
    setSeoNames([]);
    setIsDownloadDialogOpen(false);
  };

  // Handle continuing with editing after download
  const handleContinueEditing = () => {
    setIsDownloadDialogOpen(false);
  };

  // Handle background removal for a single image
  const handleRemoveBackground = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;
    
    setIsRemovingBackground(true);
    setBackgroundRemovalProgress({ processed: 0, total: 1 });
    
    try {
      // Process image to remove background
      const processedData = await processImageBackground(image);
      
      // Update image state with processed data
      const updatedImages = images.map(img => 
        img.id === imageId 
          ? getUpdatedImageWithBackground(img, processedData)
          : img
      );
      
      setImages(updatedImages);
      
      // Immediately process adjustments for the new transparent image
      if (isOpenCVReady) {
        setIsProcessing(true);
        const updatedImage = updatedImages.find(img => img.id === imageId);
        if (updatedImage) {
          try {
            const currentPreset = getCurrentPreset();
            console.log('Applying adjustments to newly background-removed image:', imageId);
            
            // Process to get thumbnail with adjustments
            const { processedThumbnailUrl } = await processImage(updatedImage, adjustments, currentPreset, false);
            
            // Update the image state with processed thumbnail
            setImages(prevImages => 
              prevImages.map(img => 
                img.id === imageId 
                  ? { 
                      ...img, 
                      processedThumbnailUrl,
                      appliedPreset: currentPreset ? {
                        name: currentPreset.name,
                        width: currentPreset.width,
                        height: currentPreset.height,
                        quality: currentPreset.quality
                      } : undefined
                    }
                  : img
              )
            );
          } catch (error) {
            console.error('Error applying adjustments to transparent image', error);
          }
        }
      }

      setBackgroundRemovalProgress({ processed: 1, total: 1 });
    } catch (error) {
      console.error('Error removing background:', error);
      alert('Failed to remove background. Please try again.');
    } finally {
      setIsRemovingBackground(false);
      setIsProcessing(false);
    }
  };

  // Handle background removal for all images
  const handleRemoveAllBackgrounds = async () => {
    // Filter for images without background removed already
    const imagesToProcess = images.filter(img => !img.backgroundRemoved);
    if (imagesToProcess.length === 0) return;
    
    setIsRemovingBackground(true);
    setBackgroundRemovalProgress({ processed: 0, total: imagesToProcess.length });
    
    try {
      // Use a local array to track all processed images
      let allUpdatedImages = [...images];
      
      // Process images one by one to avoid overwhelming the browser
      for (let i = 0; i < imagesToProcess.length; i++) {
        const image = imagesToProcess[i];
        
        // Get the most up-to-date version of this image (in case it changed during processing)
        const currentImage = allUpdatedImages.find(img => img.id === image.id);
        if (!currentImage || currentImage.backgroundRemoved) continue;
        
        // Process image with background removal
        const processedData = await processImageBackground(currentImage);
        
        // Update our local tracking array with the background-removed image
        allUpdatedImages = allUpdatedImages.map(img => 
          img.id === currentImage.id 
            ? getUpdatedImageWithBackground(img, processedData)
            : img
        );
        
        // Update the React state with all processed images so far
        setImages(allUpdatedImages);
        
        // Immediately apply adjustments to the background-removed image
        if (isOpenCVReady) {
          try {
            const currentPreset = getCurrentPreset();
            console.log('Applying adjustments to newly background-removed image in batch:', currentImage.id);
            
            // Get the updated image with background removed
            const updatedImage = allUpdatedImages.find(img => img.id === currentImage.id);
            if (updatedImage) {
              // Process to get thumbnail with adjustments
              const { processedThumbnailUrl } = await processImage(updatedImage, adjustments, currentPreset, false);
              
              // Update the local array with processed thumbnail
              allUpdatedImages = allUpdatedImages.map(img => 
                img.id === currentImage.id 
                  ? { 
                      ...img, 
                      processedThumbnailUrl,
                      appliedPreset: currentPreset ? {
                        name: currentPreset.name,
                        width: currentPreset.width,
                        height: currentPreset.height,
                        quality: currentPreset.quality
                      } : undefined
                    }
                  : img
              );
              
              // Update the React state again
              setImages(allUpdatedImages);
            }
          } catch (error) {
            console.error('Error applying adjustments to batch transparent image', error);
          }
        }
        
        // Update progress
        setBackgroundRemovalProgress(prev => ({ ...prev, processed: i + 1 }));
      }
    } catch (error) {
      console.error('Error in batch background removal:', error);
      alert('Background removal failed for some images. Please try again.');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // Handle SEO product description generation
  const handleGenerateSeoProductDescription = (description: SeoProductDescription) => {
    setSeoProductDescription(description);
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          {t('title')}
        </h1>
        
        {!isOpenCVReady ? (
          <div className="brutalist-border p-4 text-center mb-6 bg-white">
            <div className="flex flex-col items-center justify-center py-8">
            <Loader size="lg" />
              <h3 className="text-lg font-bold mb-2">{t('loading')}</h3>
              <p className="text-sm text-gray-600">{t('loadingDescription')}</p>
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex justify-center mb-6">
            <Card variant="accent" className="max-w-xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold uppercase text-center">{t('transformTitle')}</h2>
                {isProUser && <ProBadge className="ml-2" />}
              </div>
              <div className="flex flex-col space-y-6">
                <div className="brutalist-border p-4 bg-white">
                  <p className="font-medium mb-2">✨ <span className="font-bold">{t('privacyFocused')}</span></p>
                  <p className="text-sm mb-2">
                    {t('privacyDescription')}
                  </p>
                  <div className="flex justify-between text-xs">
                    <Link href="/privacy" className="underline hover:text-blue-600">{t('privacyPolicy')}</Link>
                    <Link href="/terms" className="underline hover:text-blue-600">{t('termsOfUse')}</Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="brutalist-border p-3 bg-white">
                    <p className="font-bold mb-1">🎯 {t('features.presets.title')}</p>
                    <p className="text-xs">{t('features.presets.description')}</p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <p className="font-bold mb-1">🤖 {t('features.aiPowered.title')}</p>
                    <p className="text-xs">{t('features.aiPowered.description')}</p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <p className="font-bold mb-1">🎚️ {t('features.advancedControls.title')}</p>
                    <p className="text-xs">{t('features.advancedControls.description')}</p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <p className="font-bold mb-1">⚡ {t('features.batchProcessing.title')}</p>
                    <p className="text-xs">{t('features.batchProcessing.description')}</p>
                  </div>
                </div>

                <div className="brutalist-border p-3 bg-white">
                  <div className="flex items-center mb-2">
                    <p className="font-bold">{isProUser ? t('proMode') : t('freePlan')}</p>
                    {isProUser && <ProBadge className="ml-2" />}
                  </div>
                  <p className="text-xs mb-1">
                    {isProUser 
                      ? t('proDescription', { maxImages: MAX_IMAGES }) 
                      : t('freeDescription', { maxImages: MAX_IMAGES })}
                  </p>
                  {!isProUser && (
                    <div className="mt-2">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => router.push('/pricing')}
                      >
                        {t('upgradeToPro')}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="fileInput"
                  />
                  <div className="w-full flex justify-center space-x-2">
                    <label htmlFor="fileInput" className="flex-grow flex justify-center">
                      <Button as="span" variant="accent" size="lg" disabled={isProcessing}>
                        {t('selectImages', { maxImages: isProUser ? "100" : "5" })}
                      </Button>
                    </label>
                    {!isProUser && (
                      <Button 
                        variant="secondary" 
                        size="lg"
                        onClick={() => router.push('/pricing')}
                      >
                        {t('upgradeToPro')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 md:sticky md:top-4 md:self-start">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t('imageEditor')}</h2>
                {isProUser && <ProBadge />}
              </div>
            
              <ImagePreview
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={setSelectedImageId}
                onDownloadImage={handleDownloadImage}
                onDeleteImage={handleDeleteImage}
                isProcessing={isProcessing}
                isRemovingBackground={isRemovingBackground}
                className="mb-6"
                appliedSettings={{
                  preset: selectedPreset,
                  presetName: getCurrentPresetName(),
                  applyToAll
                }}
                maxImagesAllowed={MAX_IMAGES}
                isPro={isProUser}
              />
              
              <div className="mb-6 flex justify-between items-center">
                <div className="flex space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="fileInputMore"
                  />
                  <label htmlFor="fileInputMore">
                    <Button 
                      as="span" 
                      variant="default" 
                      disabled={isProcessing || (images.length >= MAX_IMAGES && isProUser)}
                    >
                      {images.length >= MAX_IMAGES ? t('maxImagesReached') : t('selectMoreImages')}
                    </Button>
                  </label>
                  
                  {!isProUser && images.length >= MAX_IMAGES && (
                    <Button 
                      variant="accent"
                      onClick={() => router.push('/pricing')}
                    >
                      {t('upgradeToPro')}
                    </Button>
                  )}
                </div>
                
                <div className="text-sm">
                  {t('imagesCount', { current: images.length, max: MAX_IMAGES })}
                  {!isProUser && (
                    <span className="ml-2 text-xs text-gray-600">
                      {t('upgradeFor')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <ImageProcessingProvider
                adjustments={adjustments}
                onAdjustmentsChange={setAdjustments}
                applyToAll={applyToAll}
                setApplyToAll={setApplyToAll}
                onReset={handleReset}
                selectedImageId={selectedImageId}
                isProcessing={isProcessing}
                isRemovingBackground={isRemovingBackground}
                hasBackgroundRemoved={selectedImageId ? images.find(img => img.id === selectedImageId)?.backgroundRemoved || false : false}
                totalImages={backgroundRemovalProgress.total}
                processedCount={backgroundRemovalProgress.processed}
                onRemoveBackground={handleRemoveBackground}
                onRemoveAllBackgrounds={handleRemoveAllBackgrounds}
              >
                <ImageProcessingControls />
              </ImageProcessingProvider>

              <Card title={t('imageOptimization')} variant="accent">
                <PresetsSelector
                  presets={getAllPresets()}
                  selectedPreset={selectedPreset}
                  onSelectPreset={setSelectedPreset}
                  onCustomSettingsChange={handleCustomSettingsChange}
                />
              </Card>

              <SeoNameGenerator
                seoNames={seoNames}
                onGenerateSeoNames={handleGenerateSeoNames}
                isGenerating={isGeneratingSeoNames}
                imageCount={images.length}
              />

              <SeoProductDescriptionGenerator 
                onGenerateDescription={handleGenerateSeoProductDescription}
                downloadWithImages={true}
              />

              <DownloadOptions
                onDownload={handleInitiateDownload}
                hasBackgroundRemovedImages={images.some(img => img.backgroundRemoved)}
                hasSeoProductDescription={seoProductDescription !== null}
              />
            </div>
          </div>
        )}
      </div>

      {/* Download Dialog */}
      <DownloadDialog
        isOpen={isDownloadDialogOpen}
        onClose={downloadComplete ? handleContinueEditing : handleConfirmDownload}
        imageCount={images.filter(img => img.processedThumbnailUrl || img.backgroundRemoved).length}
        onStartNewBundle={handleStartNewBundle}
        onContinueEditing={handleContinueEditing}
        hasAppliedChanges={images.some(img => img.processedThumbnailUrl || img.backgroundRemoved)}
        appliedPresetName={getCurrentPresetName()}
        isDownloading={isDownloading}
        downloadComplete={downloadComplete}
        formatType={downloadFormat}
        hasSeoNames={images.some(img => !!img.seoName)}
        hasRemovedBackgrounds={images.some(img => img.backgroundRemoved)}
        hasSeoProductDescription={seoProductDescription !== null}
      />
      
      {/* Pro Upgrade Dialog */}
      <ProUpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        feature={tDialogs('proUpgrade.feature')}
        maxImagesCount={100}
      />
    </main>
  );
}
