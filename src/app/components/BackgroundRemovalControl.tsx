import React, { useState } from 'react';
import Button from './Button';
import Card from './Card';
import { ImageFile } from './ImagePreview';

interface BackgroundRemovalControlProps {
  selectedImageId: string | null;
  isProcessing: boolean;
  isRemovingBackground: boolean;
  hasBackgroundRemoved: boolean;
  applyToAll: boolean;
  totalImages: number;
  processedCount: number;
  onRemoveBackground: (id: string) => void;
  onRemoveAllBackgrounds: () => void;
  onResetBackground: (imageId: string | null) => void;
  images: ImageFile[];
  className?: string;
}

export default function BackgroundRemovalControl({
  selectedImageId,
  isProcessing,
  isRemovingBackground,
  hasBackgroundRemoved,
  applyToAll,
  totalImages,
  processedCount,
  onRemoveBackground,
  onRemoveAllBackgrounds,
  onResetBackground,
  images,
  className = '',
}: BackgroundRemovalControlProps) {
  
  const handleRemoveBackground = () => {
    if (applyToAll) {
      onRemoveAllBackgrounds();
    } else if (selectedImageId) {
      onRemoveBackground(selectedImageId);
    }
  };

  const handleResetBackground = () => {
    if (applyToAll) {
      onResetBackground(null); // Reset all images
    } else if (selectedImageId) {
      onResetBackground(selectedImageId); // Reset just the selected image
    }
  };

  // Calculate processing progress percentage
  const progressPercentage = totalImages > 0 ? Math.round((processedCount / totalImages) * 100) : 0;

  return (
    <Card
      title="BACKGROUND REMOVAL"
      className={className}
      variant="accent"
    >
      <div className="space-y-4">
        {/* Info Section */}
        <div className="brutalist-border p-4 bg-white">
          <h3 className="font-bold mb-2">AI BACKGROUND REMOVAL</h3>
          <p className="text-sm mb-2">
            Remove the background from your product image with AI technology. The process occurs entirely in your browser for privacy.
          </p>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="font-bold">Process:</span>
              <span>In-browser AI processing</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Result:</span>
              <span>Transparent background PNG</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Mode:</span>
              <span>{applyToAll ? "All images" : "Selected image only"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Remove Background Button */}
          <Button
            variant="accent"
            disabled={
              (!selectedImageId && !applyToAll) || 
              isProcessing || 
              isRemovingBackground || 
              (hasBackgroundRemoved && !applyToAll)
            }
            onClick={handleRemoveBackground}
            className="w-full uppercase"
          >
            {isRemovingBackground 
              ? `REMOVING BACKGROUND${applyToAll ? 'S' : ''}...`
              : applyToAll
                ? "REMOVE ALL BACKGROUNDS"
                : hasBackgroundRemoved
                  ? "BACKGROUND REMOVED"
                  : "REMOVE BACKGROUND"
            }
          </Button>

          {/* Reset Button - Only show when backgrounds have been removed */}
          {(hasBackgroundRemoved || images.some(img => img.backgroundRemoved)) && (
            <Button
              variant="secondary"
              disabled={isProcessing || isRemovingBackground}
              onClick={handleResetBackground}
              className="w-full uppercase"
            >
              {applyToAll ? "RESET ALL BACKGROUNDS" : "RESET BACKGROUND"}
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        {isRemovingBackground && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold">Processing:</span>
              <span>{processedCount} of {totalImages} images</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-3 brutalist-border bg-white overflow-hidden">
              <div 
                className="h-full bg-[#4F46E5]"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-center mt-1">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 w-full h-full border-4 border-t-[#4F46E5] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        )}

        {/* Info Notes */}
        <div className="text-xs text-gray-600 border-t border-gray-200 pt-3">
          <p className="mb-1">
            <span className="font-bold">Note:</span> Background removal works best with clear, well-lit product photos.
          </p>
          <p className="mb-1">
            This process may take 10-30 seconds depending on your device performance.
          </p>
          <p>
            <span className="font-bold">Tip:</span> PNG format is automatically selected when downloading images with removed backgrounds.
          </p>
        </div>
      </div>
    </Card>
  );
} 