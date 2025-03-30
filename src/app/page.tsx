'use client';

import { useEffect, useState } from 'react';
import Card from './components/Card';
import Button from './components/Button';
import ImagePreview, { ImageFile } from './components/ImagePreview';
import ImageProcessingControls, { ImageAdjustments, defaultAdjustments } from './components/ImageProcessingControls';
import PresetsSelector, { defaultPresets, Preset } from './components/PresetsSelector';
import DownloadOptions, { ImageFormat } from './components/DownloadOptions';
import DownloadDialog from './components/DownloadDialog';
import { 
  initOpenCV, 
  processImage, 
  createImageFile, 
  downloadAllImages,
  downloadImage,
  ImageFormat as LibImageFormat
} from './lib/imageProcessing';

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPresetSettings, setCustomPresetSettings] = useState<Preset | null>(null);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);
  
  // Download dialog state
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<LibImageFormat>('jpg');

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

      try {
        const currentPreset = getCurrentPreset();
        
        // Use the current images from state closure
        const imagesToProcess = [...images];
        const updatedImages = await Promise.all(
          imagesToProcess.map(async (image) => {
            // Only update the selected image (or all images if applyToAll is true)
            if ((selectedImageId && image.id === selectedImageId) || applyToAll) {
              // Process only thumbnails for preview - much faster
              const { processedThumbnailUrl } = await processImage(image, adjustments, currentPreset, false);
              
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
      
      // Limit total selection to 10 images
      const totalImages = [...images, ...newImages];
      if (totalImages.length > 10) {
        alert("Maximum 10 images allowed. Only the first " + (10 - images.length) + " images will be added.");
        const limitedNewImages = newImages.slice(0, 10 - images.length);
        setImages([...images, ...limitedNewImages]);
        
        // Select the first image if none is selected
        if (!selectedImageId && limitedNewImages.length > 0) {
          setSelectedImageId(limitedNewImages[0].id);
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
    if (image.processedDataUrl) {
      // If we already have the processed full image, download it
      downloadImage(image.processedDataUrl, `processed_${image.file.name}`, format);
    } else if (image.processedThumbnailUrl) {
      // Process the full-size image now
      setIsProcessing(true);
      try {
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
          downloadImage(processedDataUrl, `processed_${image.file.name}`, format);
        }
      } catch (error) {
        console.error('Error processing full image for download', error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Download the original if no processing has been done
      downloadImage(image.dataUrl, image.file.name, format);
    }
  };

  const handleInitiateDownload = (format: ImageFormat) => {
    setDownloadFormat(format as LibImageFormat);
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
    const processedImages = images.filter(img => img.processedThumbnailUrl);
    if (processedImages.length === 0) return;
    
    setIsProcessing(true);
    try {
      const currentPreset = getCurrentPreset();
      
      // Process full-size versions of all images before download
      const fullyProcessedImages = await Promise.all(
        images.map(async (image) => {
          // Only process images that need processing (either selected or all if applyToAll is true)
          if (selectedImageId === image.id || applyToAll) {
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
      
      // Download all the processed images
      const updatedImages = fullyProcessedImages.filter(img => img.processedDataUrl);
      downloadAllImages(updatedImages, format, true);
    } catch (error) {
      console.error('Error processing images for download', error);
    } finally {
      setIsProcessing(false);
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
    setIsDownloadDialogOpen(false);
  };

  // Handle continuing with editing after download
  const handleContinueEditing = () => {
    setIsDownloadDialogOpen(false);
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          PICME: SEO IMAGE OPTIMIZER
        </h1>
        
        <div className="mb-6">
          <Card variant="accent">
            <h2 className="text-xl font-bold mb-4 uppercase">UPLOAD IMAGES</h2>
            <div className="flex flex-col space-y-4">
              <p className="text-sm">
                Select product photos to optimize for SEO. Adjust white balance, contrast, and size.
              </p>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="fileInput"
                />
                <label htmlFor="fileInput">
                  <Button as="span" fullWidth variant="accent" disabled={isProcessing}>
                    SELECT IMAGES
                  </Button>
                </label>
              </div>
            </div>
          </Card>
        </div>

   
        {!isOpenCVReady && (
          <div className="brutalist-border p-4 text-center mb-6 bg-white">
            <p>Loading OpenCV.js... Please wait.</p>
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 md:sticky md:top-4 md:self-start">
              <ImagePreview
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={setSelectedImageId}
                onDownloadImage={handleDownloadImage}
                onDeleteImage={handleDeleteImage}
                isProcessing={isProcessing}
                className="mb-6"
                appliedSettings={{
                  preset: selectedPreset,
                  presetName: getCurrentPresetName(),
                  applyToAll
                }}
              />
            </div>

            <div className="space-y-6">
              <ImageProcessingControls
                adjustments={adjustments}
                onAdjustmentsChange={setAdjustments}
                applyToAll={applyToAll}
                setApplyToAll={setApplyToAll}
                onReset={handleReset}
              />

              <Card title="IMAGE OPTIMIZATION" variant="accent">
                <PresetsSelector
                  presets={getAllPresets()}
                  selectedPreset={selectedPreset}
                  onSelectPreset={setSelectedPreset}
                  onCustomSettingsChange={handleCustomSettingsChange}
                />
              </Card>

              <DownloadOptions
                onDownload={handleInitiateDownload}
              />
            </div>
          </div>
        )}
      </div>

      {/* Download Dialog */}
      <DownloadDialog
        isOpen={isDownloadDialogOpen}
        onClose={downloadComplete ? handleContinueEditing : handleConfirmDownload}
        imageCount={images.filter(img => img.processedThumbnailUrl).length}
        onStartNewBundle={handleStartNewBundle}
        onContinueEditing={handleContinueEditing}
        hasAppliedChanges={images.some(img => img.processedThumbnailUrl)}
        appliedPresetName={getCurrentPresetName()}
        isDownloading={isDownloading}
        downloadComplete={downloadComplete}
        formatType={downloadFormat}
      />
    </main>
  );
}
