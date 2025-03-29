'use client';

import { useEffect, useState } from 'react';
import Card from './components/Card';
import Button from './components/Button';
import ImagePreview, { ImageFile } from './components/ImagePreview';
import ImageProcessingControls, { ImageAdjustments, defaultAdjustments } from './components/ImageProcessingControls';
import PresetsSelector, { defaultPresets } from './components/PresetsSelector';
import { 
  initOpenCV, 
  processImage, 
  createImageFile, 
  downloadAllImages 
} from './lib/imageProcessing';

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
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

  // Real-time preview processing with adjustments
  useEffect(() => {
    const applyPreviewAdjustments = async () => {
      if (!isOpenCVReady || images.length === 0) return;

      try {
        const updatedImages = await Promise.all(
          images.map(async (image) => {
            // Only update the selected image (or all images if applyToAll is true)
            if ((selectedImageId && image.id === selectedImageId) || applyToAll) {
              const preset = selectedPreset 
                ? defaultPresets.find(p => p.id === selectedPreset) || null
                : null;
              
              const processedDataUrl = await processImage(image, adjustments, preset);
              
              return {
                ...image,
                processedDataUrl,
              };
            }
            return image;
          })
        );

        setImages(updatedImages);
      } catch (error) {
        console.error('Error applying preview adjustments', error);
      }
    };

    const timeoutId = setTimeout(() => {
      applyPreviewAdjustments();
    }, 200); // Debounce

    return () => clearTimeout(timeoutId);
  }, [adjustments, isOpenCVReady, selectedImageId, images, selectedPreset, applyToAll]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const fileArray = Array.from(e.target.files);
    
    try {
      const newImages = await Promise.all(fileArray.map(createImageFile));
      setImages([...images, ...newImages]);
      
      // Select the first image if none is selected
      if (!selectedImageId && newImages.length > 0) {
        setSelectedImageId(newImages[0].id);
      }
    } catch (error) {
      console.error('Error processing uploaded files', error);
    }
  };

  const handleProcessAllImages = async () => {
    if (!isOpenCVReady || images.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const preset = selectedPreset 
        ? defaultPresets.find(p => p.id === selectedPreset) || null
        : null;
      
      const processedImages = await Promise.all(
        images.map(async (image) => {
          // Process selected image or all images based on applyToAll setting
          if (selectedImageId === image.id || applyToAll) {
            const processedDataUrl = await processImage(image, adjustments, preset);
            return {
              ...image,
              processedDataUrl,
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

  const handleReset = () => {
    setAdjustments(defaultAdjustments);
    setSelectedPreset(null);
  };

  const handleDownloadAll = () => {
    const processedImages = images.filter(img => img.processedDataUrl);
    if (processedImages.length > 0) {
      downloadAllImages(processedImages);
    }
  };

  const canDownload = images.some(img => img.processedDataUrl);

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
                  <Button as="span" fullWidth variant="accent">
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
            <div className="md:col-span-2">
              <ImagePreview
                images={images}
                selectedImageId={selectedImageId}
                onSelectImage={setSelectedImageId}
                className="mb-6"
              />
            </div>

            <div className="space-y-6">
              <ImageProcessingControls
                adjustments={adjustments}
                onAdjustmentsChange={setAdjustments}
                onProcessImages={handleProcessAllImages}
                onReset={handleReset}
                onDownload={canDownload ? handleDownloadAll : () => {}}
                applyToAll={applyToAll}
                setApplyToAll={setApplyToAll}
              />

              <Card title="SEO PRESETS" variant="accent">
                <PresetsSelector
                  presets={defaultPresets}
                  selectedPreset={selectedPreset}
                  onSelectPreset={setSelectedPreset}
                />
              </Card>
            </div>
          </div>
        )}

        <div className="mt-8 text-center border-t-2 border-black pt-4">
          <p className="text-sm">
            All image processing happens in your browser for privacy and speed.
            <br />
            Using OpenCV.js for professional-grade image manipulation.
          </p>
        </div>
      </div>
    </main>
  );
}
