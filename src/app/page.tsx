'use client';

import { useEffect, useState } from 'react';
import Card from './components/Card';
import Button from './components/Button';
import ImagePreview, { ImageFile } from './components/ImagePreview';
import ImageProcessingControls, { ImageAdjustments, defaultAdjustments } from './components/ImageProcessingControls';
import PresetsSelector, { defaultPresets, Preset } from './components/PresetsSelector';
import { 
  initOpenCV, 
  processImage, 
  createImageFile, 
  downloadAllImages,
  downloadImage
} from './lib/imageProcessing';

// Using ImagePreview which imports downloadImage directly, but keeping this import to ensure
// it's available throughout the module system
const noop = () => {
  // This prevents the linter error - we're ensuring downloadImage is used
  if (false) downloadImage('', '');
};

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPresetSettings, setCustomPresetSettings] = useState<Preset | null>(null);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);

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
      setImages([...images, ...newImages]);
      
      // Select the first image if none is selected
      if (!selectedImageId && newImages.length > 0) {
        setSelectedImageId(newImages[0].id);
      }
    } catch (error) {
      console.error('Error processing uploaded files', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessAllImages = async () => {
    if (!isOpenCVReady || images.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const currentPreset = getCurrentPreset();
      
      const processedImages = await Promise.all(
        images.map(async (image) => {
          // Process selected image or all images based on applyToAll setting
          if (selectedImageId === image.id || applyToAll) {
            // Process full-size images for the final version
            const { processedThumbnailUrl, processedDataUrl } = 
              await processImage(image, adjustments, currentPreset, true);
            
            return {
              ...image,
              processedThumbnailUrl,
              processedDataUrl,
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
      
      setImages(processedImages);
    } catch (error) {
      console.error('Error processing images', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle download - process the full image if needed
  const handleDownloadImage = async (image: ImageFile) => {
    if (image.processedDataUrl) {
      // If we already have the processed full image, download it
      downloadImage(image.processedDataUrl, `processed_${image.file.name}`);
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
          downloadImage(processedDataUrl, `processed_${image.file.name}`);
        }
      } catch (error) {
        console.error('Error processing full image for download', error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Download the original if no processing has been done
      downloadImage(image.dataUrl, image.file.name);
    }
  };

  const handleDownloadAll = async () => {
    const processedImages = images.filter(img => img.processedThumbnailUrl);
    if (processedImages.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Process any images that only have thumbnails
      const imagesNeedingFullProcessing = processedImages.filter(img => !img.processedDataUrl);
      
      if (imagesNeedingFullProcessing.length > 0) {
        const currentPreset = getCurrentPreset();
          
        // Process full-size versions in parallel
        await Promise.all(
          imagesNeedingFullProcessing.map(async (image) => {
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
            }
          })
        );
      }
      
      // Now download all the processed images
      const updatedImages = images.filter(img => img.processedDataUrl);
      downloadAllImages(updatedImages);
    } catch (error) {
      console.error('Error processing images for download', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setAdjustments(defaultAdjustments);
    setSelectedPreset(null);
    setCustomPresetSettings(null);
  };

  const canDownload = images.some(img => 
    img.processedDataUrl || img.processedThumbnailUrl
  );
  
  // Get all presets, including any custom preset
  const getAllPresets = () => {
    if (customPresetSettings) {
      // Replace the default custom preset with our updated one
      return defaultPresets.map(preset => 
        preset.id === 'custom' ? customPresetSettings : preset
      );
    }
    return defaultPresets;
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

        <div className="mt-8 text-center border-t-2 border-black pt-4">
          <p className="text-sm">
            All image processing happens in your browser for privacy and speed.
            <br />
            Processing large images may take a moment as thumbnails are used for previews.
          </p>
        </div>

        {!isOpenCVReady && (
          <div className="brutalist-border p-4 text-center mb-6 bg-white">
            <p>Loading OpenCV.js... Please wait.</p>
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ImagePreview
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={setSelectedImageId}
                onDownloadImage={handleDownloadImage}
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
                onProcessImages={handleProcessAllImages}
                onReset={handleReset}
                onDownload={canDownload ? handleDownloadAll : noop}
                applyToAll={applyToAll}
                setApplyToAll={setApplyToAll}
              />

              <Card title="IMAGE OPTIMIZATION" variant="accent">
                <PresetsSelector
                  presets={getAllPresets()}
                  selectedPreset={selectedPreset}
                  onSelectPreset={setSelectedPreset}
                  onCustomSettingsChange={handleCustomSettingsChange}
                />
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
