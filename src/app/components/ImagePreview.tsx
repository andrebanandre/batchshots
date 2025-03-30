import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from './Button';
import { downloadImage } from '../lib/imageProcessing';

export interface ImageFile {
  id: string;
  file: File;
  dataUrl: string;
  thumbnailDataUrl?: string; // Thumbnail for faster previews
  processedDataUrl?: string;
  processedThumbnailUrl?: string; // Processed thumbnail for faster previews
  dimensions?: { width: number; height: number; size: string };
  appliedPreset?: {
    name: string;
    width: number;
    height: number | null;
    quality: number;
  };
}

interface ImagePreviewProps {
  images: ImageFile[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  onDownloadImage?: (image: ImageFile) => void;
  isProcessing?: boolean;
  className?: string;
  appliedSettings?: {
    preset: string | null;
    presetName?: string;
    applyToAll: boolean;
  };
}

export default function ImagePreview({
  images,
  selectedImageId,
  onSelectImage,
  onDownloadImage,
  isProcessing = false,
  className = '',
  appliedSettings
}: ImagePreviewProps) {
  // State to store image dimensions
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number; size: string }>>({});
  
  // Effect to calculate dimensions for each image
  useEffect(() => {
    images.forEach(image => {
      if (!imageDimensions[image.id]) {
        const img = new window.Image();
        img.onload = () => {
          // Calculate file size in KB or MB
          const sizeInBytes = image.file.size;
          const sizeInKB = sizeInBytes / 1024;
          const sizeFormatted = sizeInKB >= 1024 
            ? `${(sizeInKB / 1024).toFixed(2)} MB` 
            : `${sizeInKB.toFixed(2)} KB`;
          
          setImageDimensions(prev => ({
            ...prev,
            [image.id]: {
              width: img.width,
              height: img.height,
              size: sizeFormatted
            }
          }));
        };
        img.src = image.dataUrl;
      }
    });
  }, [images, imageDimensions]);

  // Function to handle download of a single image
  const handleLocalDownloadImage = (image: ImageFile) => {
    if (onDownloadImage) {
      // Use the external handler if provided (for full image processing)
      onDownloadImage(image);
    } else if (image.processedDataUrl) {
      downloadImage(image.processedDataUrl, `processed_${image.file.name}`);
    } else {
      downloadImage(image.dataUrl, image.file.name);
    }
  };

  if (images.length === 0) {
    return (
      <div className={`brutalist-border p-4 text-center ${className}`}>
        <p className="text-lg">No images selected</p>
      </div>
    );
  }

  // Find the selected image
  const selectedImage = selectedImageId 
    ? images.find(img => img.id === selectedImageId) 
    : null;

  // Get dimensions of the selected image
  const selectedDimensions = selectedImage && imageDimensions[selectedImage.id];

  // Get the appropriate image URL to display (thumbnail or full)
  const getDisplayUrl = (image: ImageFile) => {
    // Prefer processed thumbnail for previews
    if (image.processedThumbnailUrl) return image.processedThumbnailUrl;
    // Fall back to processed full size if available
    if (image.processedDataUrl) return image.processedDataUrl;
    // Fall back to thumbnail if available
    if (image.thumbnailDataUrl) return image.thumbnailDataUrl;
    // Last resort - original image
    return image.dataUrl;
  };

  return (
    <div className={`${className}`}>
      {/* Global settings info */}
      {appliedSettings && (
        <div className="brutalist-border p-2 mb-4 bg-slate-50 text-sm">
          <div className="font-bold uppercase">Applied Settings:</div>
          <div className="grid grid-cols-2">
            <div>
              <span className="font-bold">Preset:</span> {appliedSettings.presetName || 'None'}
            </div>
            <div>
              <span className="font-bold">Apply to:</span> {appliedSettings.applyToAll ? 'All Images' : 'Selected Image'}
            </div>
          </div>
        </div>
      )}
      
      {/* Selected Image (Large View) */}
      {selectedImage && (
        <div className="mb-6 relative">
          <div className="brutalist-accent-card relative">
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src={getDisplayUrl(selectedImage)}
                alt={selectedImage.file.name}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            <div className="p-4 flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-bold truncate flex-1">
                  {selectedImage.file.name}
                </div>
                <Button 
                  onClick={() => handleLocalDownloadImage(selectedImage)}
                  size="sm"
                  variant="secondary"
                  disabled={isProcessing}
                >
                  DOWNLOAD
                </Button>
              </div>
              
              <div className="text-sm grid grid-cols-2 gap-x-4">
                {selectedDimensions && (
                  <>
                    <div>
                      <span className="font-bold">Dimensions: </span> 
                      {selectedDimensions.width} × {selectedDimensions.height}px
                    </div>
                    <div>
                      <span className="font-bold">Size: </span>
                      {selectedDimensions.size}
                    </div>
                  </>
                )}
                
                {/* Applied preset info */}
                {selectedImage.appliedPreset && (
                  <>
                    <div>
                      <span className="font-bold">Output: </span>
                      {selectedImage.appliedPreset.width}x{selectedImage.appliedPreset.height || 'auto'}
                    </div>
                    <div>
                      <span className="font-bold">Quality: </span>
                      {selectedImage.appliedPreset.quality}%
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Grid */}
      <h3 className="font-bold text-lg uppercase mb-2">ALL IMAGES</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => {
          const dimensions = imageDimensions[image.id];
          return (
            <div
              key={image.id}
              className={`brutalist-border p-2 cursor-pointer transition-transform hover:translate-y-[-2px] ${
                selectedImageId === image.id
                  ? 'border-3 border-l-accent border-t-primary border-r-black border-b-black'
                  : 'border-black'
              }`}
              onClick={() => onSelectImage(image.id)}
            >
              <div className="relative aspect-square w-full overflow-hidden">
                <Image
                  src={getDisplayUrl(image)}
                  alt={image.file.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-contain"
                />
              </div>
              <div className="mt-2 text-xs truncate">{image.file.name}</div>
              {dimensions && (
                <div className="mt-1 text-xs">
                  {dimensions.width} × {dimensions.height}px • {dimensions.size}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 