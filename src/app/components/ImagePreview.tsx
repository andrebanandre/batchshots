import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from './Button';
import { downloadImage, ImageFormat } from '../lib/imageProcessing';

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
  seoName?: string; // SEO-friendly filename
  originalName?: string; // Original filename for reference
}

interface ImagePreviewProps {
  images: ImageFile[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  onDownloadImage?: (image: ImageFile, format?: ImageFormat) => void;
  onDeleteImage?: (id: string) => void;
  onUpdateSeoName?: (id: string, seoName: string) => void;
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
  onDeleteImage,
  onUpdateSeoName,
  isProcessing = false,
  className = '',
}: ImagePreviewProps) {
  // State to store image dimensions
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number; size: string }>>({});
  // State for editing SEO name
  const [editingSeoName, setEditingSeoName] = useState<string | null>(null);
  const [seoNameValue, setSeoNameValue] = useState('');
  
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
      downloadImage(image.processedDataUrl, `processed_${image.file.name}`, 'jpg');
    } else {
      downloadImage(image.dataUrl, image.file.name, 'jpg');
    }
  };

  // Function to handle image deletion
  const handleDelete = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation(); // Prevent triggering the thumbnail selection
    if (onDeleteImage) {
      onDeleteImage(imageId);
    }
  };

  // Start editing SEO name
  const handleStartEditSeoName = (imageId: string, currentSeoName: string) => {
    setEditingSeoName(imageId);
    setSeoNameValue(currentSeoName);
  };

  // Save edited SEO name
  const handleSaveSeoName = () => {
    if (editingSeoName && onUpdateSeoName) {
      onUpdateSeoName(editingSeoName, seoNameValue);
      setEditingSeoName(null);
    }
  };

  // Cancel editing SEO name
  const handleCancelEditSeoName = () => {
    setEditingSeoName(null);
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

  // Get file extension from name
  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  };

  // Format display name (SEO name if available, otherwise original filename)
  const getDisplayName = (image: ImageFile): string => {
    if (image.seoName) {
      const extension = getFileExtension(image.file.name);
      return `${image.seoName}.${extension}`;
    }
    return image.file.name;
  };

  return (
    <div className={`${className}`}>
      
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
              {/* File name with SEO name editing capability */}
              {editingSeoName === selectedImage.id ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold">SEO-Friendly Name:</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        className="flex-grow p-1 brutalist-border mr-1"
                        value={seoNameValue}
                        onChange={(e) => setSeoNameValue(e.target.value)}
                      />
                      <span className="text-sm">.{getFileExtension(selectedImage.file.name)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      onClick={handleCancelEditSeoName}
                      size="sm"
                      variant="secondary"
                    >
                      CANCEL
                    </Button>
                    <Button 
                      onClick={handleSaveSeoName}
                      size="sm"
                      variant="accent"
                    >
                      SAVE
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="font-bold truncate flex-1">
                    {getDisplayName(selectedImage)}
                    {selectedImage.seoName && onUpdateSeoName && (
                      <button
                        onClick={() => handleStartEditSeoName(selectedImage.id, selectedImage.seoName!)}
                        className="ml-2 text-xs font-bold py-1 px-2 brutalist-border hover:bg-slate-100 text-gray-700"
                        title="Edit SEO name"
                      >
                        EDIT
                      </button>
                    )}
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
              )}
              
              {/* Original filename if SEO name exists */}
              {selectedImage.seoName && selectedImage.originalName && !editingSeoName && (
                <div className="text-xs text-gray-500">
                  <span className="font-bold">Original name: </span>
                  {selectedImage.originalName}
                </div>
              )}

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
      <h3 className="font-bold text-lg uppercase mb-2">ALL IMAGES ({images.length}/10)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image, index) => {
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
                {/* Image number indicator */}
                <div className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded-sm">
                  {index + 1}/10
                </div>
                {/* Delete button */}
                {onDeleteImage && (
                  <button 
                    onClick={(e) => handleDelete(e, image.id)}
                    className="absolute top-1 right-1 bg-accent text-white text-xs px-2 py-1 rounded-sm hover:bg-accent-700"
                    disabled={isProcessing}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-2 text-xs truncate">
                {getDisplayName(image)}
              </div>
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