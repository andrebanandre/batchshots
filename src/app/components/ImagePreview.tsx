import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Button from './Button';
import type { ImageFormat } from '../lib/imageProcessing';
import Loader from './Loader';
import { useTranslations } from 'next-intl';

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
  backgroundRemoved?: boolean; // Flag to indicate if background has been removed
}

interface ImagePreviewProps {
  images: ImageFile[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  onDownloadImage: (image: ImageFile, format?: ImageFormat) => void;
  onDeleteImage: (id: string) => void;
  isProcessing?: boolean;
  isRemovingBackground?: boolean;
  className?: string;
  appliedSettings?: {
    preset: string | null;
    presetName?: string;
    applyToAll: boolean;
  };
  maxImagesAllowed?: number;
}

export default function ImagePreview({
  images,
  selectedImageId,
  onSelectImage,
  onDownloadImage,
  onDeleteImage,
  isProcessing = false,
  isRemovingBackground = false,
  className = '',
  appliedSettings,
  maxImagesAllowed = 10,
}: ImagePreviewProps) {
  const t = useTranslations('Components.ImagePreview');
  
  // State to store image dimensions
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number; size: string }>>({});
  // State for editing SEO name
  const [editingSeoName, setEditingSeoName] = useState<string | null>(null);
  const [seoNameValue, setSeoNameValue] = useState('');
  // State to store locally updated images
  const [localImages, setLocalImages] = useState<ImageFile[]>(images);
  
  // State for image zoom and pan functionality
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Reset zoom and position when selected image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [selectedImageId]);
  
  // Add wheel event listener with passive: false to prevent scrolling
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;
    
    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Zoom in or out based on wheel direction
      if (e.deltaY < 0) {
        setScale(prev => Math.min(prev + 0.1, 5));
      } else {
        setScale(prev => Math.max(prev - 0.1, 0.5));
      }
    };
    
    // Use the capture phase to intercept the event early
    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, []);
  
  // Update local images when prop changes
  useEffect(() => {
    setLocalImages(images);
  }, [images]);
  
  // Effect to calculate dimensions for each image
  useEffect(() => {
    localImages.forEach(image => {
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
  }, [localImages, imageDimensions]);

  // Function to handle download of a single image
  const handleLocalDownloadImage = (image: ImageFile) => {
    onDownloadImage(image);
  };

  // Function to handle image deletion
  const handleDelete = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation(); // Prevent triggering the thumbnail selection
    onDeleteImage(imageId);
  };

  // Start editing SEO name
  const handleStartEditSeoName = (imageId: string, currentSeoName: string) => {
    setEditingSeoName(imageId);
    setSeoNameValue(currentSeoName);
  };

  // Save edited SEO name
  const handleSaveSeoName = () => {
    if (editingSeoName) {
      // Update the SEO name locally
      setLocalImages(prevImages => 
        prevImages.map(image => 
          image.id === editingSeoName
            ? { ...image, seoName: seoNameValue }
            : image
        )
      );
      setEditingSeoName(null);
    }
  };

  // Cancel editing SEO name
  const handleCancelEditSeoName = () => {
    setEditingSeoName(null);
  };

  // Zoom handling functions
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 5)); // Limit max zoom to 5x
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5)); // Limit min zoom to 0.5x
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Handle mouse/touch events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Handle wheel event for zooming with mouse wheel - keep this as a backup
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.1, 5));
    } else {
      setScale(prev => Math.max(prev - 0.1, 0.5));
    }
  };

  if (localImages.length === 0) {
    return (
      <div className={`brutalist-border p-4 text-center ${className}`}>
        <p className="text-lg">{t('noImages')}</p>
      </div>
    );
  }

  // Find the selected image
  const selectedImage = selectedImageId 
    ? localImages.find(img => img.id === selectedImageId) 
    : null;

  // Get dimensions of the selected image
  const selectedDimensions = selectedImage && imageDimensions[selectedImage.id];

  // Get the appropriate image URL to display (thumbnail or full)
  const getDisplayUrl = (image: ImageFile) => {
    // For transparent images (background removed), prioritize processed PNG sources if available
    if (image.backgroundRemoved) {
      // Use processed thumbnail if available
      if (image.processedThumbnailUrl) return image.processedThumbnailUrl;
      // Fall back to processed full size if available
      if (image.processedDataUrl) return image.processedDataUrl;
      // Fall back to original background-removed data URL
      return image.dataUrl;
    }
    
    // For regular images, use standard priority order
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
            {/* Zoom controls */}
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <button 
                onClick={handleZoomIn}
                className="brutalist-border border-3 bg-white text-black w-8 h-8 flex items-center justify-center text-xl shadow-brutalist hover:translate-y-[-2px] transition-transform"
                aria-label="Zoom in"
              >
                +
              </button>
              <button 
                onClick={handleZoomOut}
                className="brutalist-border border-3 bg-white text-black w-8 h-8 flex items-center justify-center text-xl shadow-brutalist hover:translate-y-[-2px] transition-transform"
                aria-label="Zoom out"
              >
                -
              </button>
              <button 
                onClick={handleReset}
                className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white text-black w-auto px-2 h-8 flex items-center justify-center text-xs font-bold shadow-brutalist hover:translate-y-[-2px] transition-transform"
                aria-label="Reset zoom"
              >
                RESET
              </button>
            </div>
            
            <div 
              ref={imageContainerRef}
              className={`relative aspect-video w-full overflow-hidden cursor-grab touch-none ${selectedImage.backgroundRemoved ? 'transparent-bg' : ''}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <div 
                className="absolute transition-transform duration-75 ease-out"
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center',
                  width: '100%',
                  height: '100%'
                }}
              >
                <Image
                  src={getDisplayUrl(selectedImage)}
                  alt={selectedImage.file.name}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                  draggable={false}
                  unoptimized={selectedImage.backgroundRemoved}
                />
              </div>
              
           
              {/* Mobile zoom instructions */}
              <div className="absolute bottom-2 left-2 brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white text-black text-xs p-2 md:hidden">
                {t('zoomInstructions')}
              </div>
              
              {/* Zoom level indicator */}
              <div className="absolute bottom-2 right-2 brutalist-border border-3 bg-white text-black text-xs p-2">
                {t('zoomLevel', { scale: Math.round(scale * 100) })}
              </div>

         
              
              {isRemovingBackground && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex flex-col items-center space-y-3">
                    <Loader size="lg" />
                    <p className="text-white font-semibold">{t('removingBackground')}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col space-y-2">
              {/* File name with SEO name editing capability */}
              {editingSeoName === selectedImage.id ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold">{t('seoName.label')}</label>
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
                      {t('seoName.cancel')}
                    </Button>
                    <Button 
                      onClick={handleSaveSeoName}
                      size="sm"
                      variant="accent"
                    >
                      {t('seoName.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="font-bold truncate flex-1">
                    {getDisplayName(selectedImage)}
                    {selectedImage.seoName && (
                      <button
                        onClick={() => handleStartEditSeoName(selectedImage.id, selectedImage.seoName!)}
                        className="ml-2 text-xs font-bold py-1 px-2 brutalist-border hover:bg-slate-100 text-gray-700"
                        title="Edit SEO name"
                      >
                        {t('seoName.edit')}
                      </button>
                    )}
                  </div>
                  <Button 
                    onClick={() => handleLocalDownloadImage(selectedImage)}
                    size="sm"
                    variant="secondary"
                    disabled={isProcessing}
                  >
                    {t('actions.download')}
                  </Button>
                </div>
              )}

              {/* Original filename if SEO name exists */}
              {selectedImage.seoName && selectedImage.originalName && !editingSeoName && (
                <div className="text-xs text-gray-500">
                  <span className="font-bold">{t('originalName')} </span>
                  {selectedImage.originalName}
                </div>
              )}

              <div className="text-sm grid grid-cols-2 gap-x-4">
                {selectedDimensions && (
                  <>
                    <div>
                      <span className="font-bold">{t('fileInfo.dimensions')} </span> 
                      {selectedDimensions.width} × {selectedDimensions.height}px
                    </div>
                    <div>
                      <span className="font-bold">{t('fileInfo.size')} </span>
                      {selectedDimensions.size}
                    </div>
                  </>
                )}
                
                {/* Applied preset info */}
                {(selectedImage.appliedPreset || (appliedSettings && selectedImage.id === selectedImageId)) && (
                  <>
                    <div>
                      <span className="font-bold">{t('fileInfo.output')} </span>
                      {selectedImage.appliedPreset 
                        ? `${selectedImage.appliedPreset.width}x${selectedImage.appliedPreset.height || t('fileInfo.auto')}`
                        : appliedSettings?.presetName ? `[${appliedSettings.presetName}]` : t('fileInfo.custom')}
                    </div>
                    <div>
                      <span className="font-bold">{t('fileInfo.quality')} </span>
                      {selectedImage.appliedPreset ? `${selectedImage.appliedPreset.quality}%` : 'Applied'}
                    </div>
                  </>
                )}

                {/* Background removal info */}
                {selectedImage.backgroundRemoved && (
                  <div className="col-span-2">
                    <span className="font-bold">{t('fileInfo.background')} </span>
                    <span className="text-green-600">{t('fileInfo.backgroundRemoved')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Grid */}
      <h3 className="font-bold text-lg uppercase mb-2">
        {t('allImages', { current: images.length, max: maxImagesAllowed })}
      </h3>
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
              <div className={`relative aspect-square w-full overflow-hidden ${image.backgroundRemoved ? 'transparent-bg' : ''}`}>
                {/* Show PNG transparency indicator only in thumbnails */}
                <Image
                  src={getDisplayUrl(image)}
                  alt={image.file.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-contain z-10"
                  unoptimized={image.backgroundRemoved}
                />
                {/* Image number indicator */}
                <div className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded-sm z-10">
                  {index + 1}/{maxImagesAllowed}
                </div>
                {/* Delete button */}
                <button 
                  onClick={(e) => handleDelete(e, image.id)}
                  className="absolute top-1 right-1 brutalist-border border-2 border-black bg-accent text-black text-xs px-2 py-1 shadow-brutalist hover:translate-y-[-2px] transition-transform z-10"
                  disabled={isProcessing}
                >
                  ×
                </button>
                
                {/* Background removal indicator */}
                {image.backgroundRemoved && (
                  <div className="absolute bottom-1 right-1 brutalist-border border-2 border-l-accent border-t-primary border-r-black border-b-black bg-white text-black text-xs px-2 py-1 z-10 shadow-brutalist">
                    BG
                  </div>
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