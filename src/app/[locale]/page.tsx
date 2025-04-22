'use client';



import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Card from '../components/Card';
import Button from '../components/Button';
import ImagePreview, { ImageFile } from '../components/ImagePreview';
import ImageProcessingControls, { ImageAdjustments, defaultAdjustments } from '../components/ImageProcessingControls';
import PresetsSelector, { defaultPresets, Preset } from '../components/PresetsSelector';
import WatermarkControl, { WatermarkSettings, defaultWatermarkSettings } from '../components/WatermarkControl';
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
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(defaultWatermarkSettings);
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

  // Real-time preview processing with adjustments and watermarks
  useEffect(() => {
    const applyPreviewUpdates = async () => {
      if (!isOpenCVReady || images.length === 0) return;

      // Set processing state to true only if changes require processing
      // Watermark and adjustment changes trigger processing
      if (adjustments !== defaultAdjustments || watermarkSettings.enabled) {
          setIsProcessing(true);
      }
      
      console.log("Applying preview updates:", {
        adjustments,
        watermarkSettings,
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
              console.log(`Processing image ${image.id} with settings...`);
              
              // Process only thumbnails for preview - much faster
              const { processedThumbnailUrl } = await processImage(
                  image, 
                  adjustments, 
                  currentPreset, 
                  watermarkSettings, // Pass watermark settings
                  false // Process thumbnail (false)
              );
              
              // Add debug log for background-removed images
              if (image.backgroundRemoved) {
                console.log('Processing background-removed thumbnail for preview:', image.id);
              }
              
              return {
                ...image,
                processedThumbnailUrl, // Update thumbnail URL
                // Store the applied preset information
                appliedPreset: currentPreset ? {
                  name: currentPreset.name,
                  width: currentPreset.width,
                  height: currentPreset.height,
                  quality: currentPreset.quality
                } : undefined
              };
            }
            return image; // Return unchanged image if not selected/applyToAll
          })
        );
        
        setImages(updatedImages);
        console.log("Preview processing complete, images updated");
      } catch (error) {
        console.error('Error applying preview adjustments/watermark', error);
      } finally {
        // Set processing state to false when done
        setIsProcessing(false);
      }
    };

    // Debounce the effect to avoid rapid processing on slider changes etc.
    const timeoutId = setTimeout(() => {
      applyPreviewUpdates();
    }, 300); // Increased debounce time slightly

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustments, watermarkSettings, isOpenCVReady, selectedImageId, selectedPreset, applyToAll, customPresetSettings]); // Add watermarkSettings dependency

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
    console.log("Download requested for image:", image.id, "with adjustments:", adjustments, "and watermark:", watermarkSettings);
    
    // For background-removed images - always download as PNG
    if (image.backgroundRemoved) {
      setIsProcessing(true);
      try {
        const currentPreset = getCurrentPreset();
        const { processedDataUrl } = await processImage(
            image, 
            adjustments, 
            currentPreset, 
            watermarkSettings, // Pass watermark settings
            true // Process full size
        );
        
        if (processedDataUrl) {
          setImages(prev => prev.map(img => img.id === image.id ? { ...img, processedDataUrl } : img));
          downloadImage(processedDataUrl, image.file.name, 'png', image.seoName); // Force PNG
        } else {
           // Fallback to original if processing fails 
           downloadImage(image.dataUrl, image.file.name, 'png', image.seoName);
        }
      } catch (error) {
        console.error('Error processing transparent image for download', error);
        downloadImage(image.dataUrl, image.file.name, 'png', image.seoName);
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // For regular images - process full size now if needed
    if (image.processedThumbnailUrl || watermarkSettings.enabled) { // Reprocess if watermark is enabled
      setIsProcessing(true);
      try {
        const currentPreset = getCurrentPreset();
        const { processedDataUrl } = await processImage(
            image, 
            adjustments, 
            currentPreset, 
            watermarkSettings, // Pass watermark settings
            true // Process full size
        );
        
        if (processedDataUrl) {
           setImages(prev => prev.map(img => img.id === image.id ? { ...img, processedDataUrl } : img));
           downloadImage(processedDataUrl, `processed_${image.file.name}`, format, image.seoName);
        } else {
           // Fallback to original dataUrl but still attempt processing for download (like adjustments only)
           downloadImage(image.dataUrl, image.file.name, format, image.seoName, adjustments);
        }
      } catch (error) {
        console.error('Error processing full image for download', error);
        downloadImage(image.dataUrl, image.file.name, format, image.seoName, adjustments);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Download the original if no processing has been done
      downloadImage(image.dataUrl, image.file.name, format, image.seoName);
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
    const imagesToDownload = images; // Download all images
    if (imagesToDownload.length === 0) return;
    
    setIsProcessing(true);
    try {
      const currentPreset = getCurrentPreset();
      
      // Process full-size versions of all images before download
      const fullyProcessedImages = await Promise.all(
        imagesToDownload.map(async (image) => {
          // Process all images, including those with background removed
          const { processedDataUrl, processedThumbnailUrl } = await processImage(
              image, 
              adjustments, 
              currentPreset, 
              watermarkSettings, // Pass watermark settings
              true // Process full size
          );
          
          return {
            ...image,
            processedThumbnailUrl, // Keep thumbnail updated too
            processedDataUrl, // Store full processed URL
            appliedPreset: currentPreset ? {
              name: currentPreset.name,
              width: currentPreset.width,
              height: currentPreset.height,
              quality: currentPreset.quality
            } : undefined
          };
        })
      );
      
      // Update state with processed images (contains processedDataUrl)
      setImages(fullyProcessedImages);
      
      // Download all the processed images 
      downloadAllImages(fullyProcessedImages, format, true, seoProductDescription); // Removed adjustments from here as they are baked in
      
    } catch (error) {
      console.error('Error processing images for download all', error);
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
              originalName: image.file.name // Keep original name for reference
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
  
  // Handle reset of all adjustments and watermarks
  const handleReset = () => {
    setAdjustments(defaultAdjustments);
    setWatermarkSettings(defaultWatermarkSettings); // Reset watermark
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
    setWatermarkSettings(defaultWatermarkSettings); // Reset watermark
    setSelectedPreset(null);
    setCustomPresetSettings(null);
    setSeoNames([]);
    setSeoProductDescription(null); // Reset description
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
      const updatedImageWithBg = getUpdatedImageWithBackground(image, processedData);
      const updatedImages = images.map(img => img.id === imageId ? updatedImageWithBg : img);
      setImages(updatedImages);
      
      // Immediately process adjustments/watermark for the new transparent image thumbnail
      if (isOpenCVReady) {
        setIsProcessing(true);
        try {
          const currentPreset = getCurrentPreset();
          console.log('Applying preview updates to newly background-removed image:', imageId);
          
          const { processedThumbnailUrl } = await processImage(
              updatedImageWithBg, 
              adjustments, 
              currentPreset, 
              watermarkSettings, // Pass watermark settings
              false // Process thumbnail
          );
          
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
          console.error('Error applying preview updates to transparent image', error);
        } finally {
           setIsProcessing(false);
        }
      }

      setBackgroundRemovalProgress({ processed: 1, total: 1 });
    } catch (error) {
      console.error('Error removing background:', error);
      alert('Failed to remove background. Please try again.');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // Handle background removal for all images
  const handleRemoveAllBackgrounds = async () => {
    const imagesToProcess = images.filter(img => !img.backgroundRemoved);
    if (imagesToProcess.length === 0) return;
    
    setIsRemovingBackground(true);
    setBackgroundRemovalProgress({ processed: 0, total: imagesToProcess.length });
    
    try {
      let allUpdatedImages = [...images];
      
      for (let i = 0; i < imagesToProcess.length; i++) {
        const image = imagesToProcess[i];
        const currentImage = allUpdatedImages.find(img => img.id === image.id);
        if (!currentImage || currentImage.backgroundRemoved) continue;
        
        const processedData = await processImageBackground(currentImage);
        const updatedImageWithBg = getUpdatedImageWithBackground(currentImage, processedData);
        
        allUpdatedImages = allUpdatedImages.map(img => 
          img.id === currentImage.id ? updatedImageWithBg : img
        );
        setImages(allUpdatedImages); // Update state after each image
        
        // Apply adjustments/watermark to thumbnail immediately
        if (isOpenCVReady) {
          try {
            const currentPreset = getCurrentPreset();
            console.log('Applying preview updates to newly background-removed image in batch:', currentImage.id);
            
            const { processedThumbnailUrl } = await processImage(
                updatedImageWithBg, 
                adjustments, 
                currentPreset, 
                watermarkSettings, // Pass watermark settings
                false // Process thumbnail
            );
              
            // Update local array and state again with thumbnail
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
            setImages(allUpdatedImages);
            
          } catch (error) {
            console.error('Error applying preview updates to batch transparent image', error);
          }
        }
        
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
        {images.length === 0 && <h1 className="text-3xl font-bold text-center uppercase mb-6">
          {t('title')}
        </h1>}
        
        {!isOpenCVReady ? (
          <div className="brutalist-border p-4 text-center mb-6 bg-white">
            <div className="flex flex-col items-center justify-center py-8">
            <Loader size="lg" />
              <h3 className="text-lg font-bold mb-2">{t('loading')}</h3>
              <p className="text-sm text-gray-600">{t('loadingDescription')}</p>
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="brutalist-border p-6 bg-white text-center">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold uppercase">{t('transformTitle')}</h2>
                {isProUser && <ProBadge className="ml-2" />}
              </div>
              <p className="text-lg mb-6">{t('heroDescription')}</p>
              
              {/* Main CTA Button - Sticky on Mobile */}
              <div className="sticky-cta-container">
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
                    <Button as="span" variant="accent" size="lg" className="cta-button" disabled={isProcessing}>
                      {t('selectImages', { maxImages: isProUser ? "100" : "5" })}
                    </Button>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Privacy Notice */}
            <div className="brutalist-border p-4 bg-white">
              <p className="font-medium mb-2">✨ <span className="font-bold">{t('privacyFocused')}</span></p>
              <p className="text-sm">
                {t('privacyDescription')}
              </p>
            </div>

            {/* Features Grid */}
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

            {/* Pro Upgrade Call-to-Action - Matching ProBadge colors */}
            {!isProUser && (
              <div className="brutalist-border p-6 bg-yellow-400 text-center">
                <h3 className="text-xl font-bold uppercase mb-2">{t('upgradeProTitle')}</h3>
                <p className="text-sm mb-4">{t('upgradeProDescription')}</p>
                <Button 
                  variant="default" 
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 font-bold border-2 border-black"
                  onClick={() => router.push('/pricing')}
                >
                  {t('upgradeToPro')}
                </Button>
              </div>
            )}

            {/* Pro Upgrade Section */}
            <div className="brutalist-border p-4 bg-white">
              <div className="flex items-center mb-2">
                <p className="font-bold">{isProUser ? t('proMode') : t('freePlan')}</p>
                {isProUser && <ProBadge className="ml-2" />}
              </div>
              <p className="text-sm mb-3">
                {isProUser 
                  ? t('proDescription', { maxImages: MAX_IMAGES }) 
                  : t('freeDescription', { maxImages: MAX_IMAGES })}
              </p>
              {!isProUser && (
                <div className="text-center mt-2">
                  <Button 
                    variant="secondary" 
                    size="md"
                    onClick={() => router.push('/pricing')}
                    className="w-full md:w-auto"
                  >
                    {t('learnMoreAboutPro')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 md:sticky md:top-4 md:self-start space-y-6">
              <div className="flex justify-between items-center">
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
                watermarkSettings={watermarkSettings}
                onWatermarkSettingsChange={setWatermarkSettings}
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
                <WatermarkControl />
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
        imageCount={images.length}
        onStartNewBundle={handleStartNewBundle}
        onContinueEditing={handleContinueEditing}
        hasAppliedChanges={images.some(img => img.processedThumbnailUrl || img.backgroundRemoved || watermarkSettings.enabled)}
        appliedPresetName={getCurrentPresetName()}
        isDownloading={isDownloading}
        downloadComplete={downloadComplete}
        formatType={downloadFormat}
        hasSeoNames={images.some(img => !!img.seoName)}
        hasRemovedBackgrounds={images.some(img => img.backgroundRemoved)}
        hasSeoProductDescription={seoProductDescription !== null}
        hasWatermark={watermarkSettings.enabled}
      />
      
      {/* Pro Upgrade Dialog */}
      <ProUpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        feature={tDialogs('proUpgrade.feature')}
        maxImagesCount={100}
      />
      
      {/* Sticky CTA Styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .sticky-cta-container {
            position: sticky;
            bottom: 1rem;
            z-index: 10;
            padding: 0.5rem 0;
            background-color: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(5px);
            margin: 0 -1rem;
            padding: 1rem;
            border-top: 2px solid #000;
          }
          
          .cta-button {
            width: 100%;
            font-size: 1.125rem;
            padding: 0.75rem 1.5rem;
          }
        }
      `}</style>
    </main>
  );
}
