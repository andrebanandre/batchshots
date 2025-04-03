'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ImageAdjustments, defaultAdjustments } from '../components/ImageProcessingControls';

interface ImageProcessingContextProps {
  // Image adjustment state
  adjustments: ImageAdjustments;
  setAdjustments: (adjustments: ImageAdjustments) => void;
  
  // Apply to all toggle
  applyToAll: boolean;
  setApplyToAll: (value: boolean) => void;
  
  // Background removal state
  selectedImageId: string | null;
  isProcessing: boolean;
  isRemovingBackground: boolean;
  hasBackgroundRemoved: boolean;
  totalImages: number;
  processedCount: number;
  
  // Action handlers
  handleReset: () => void;
  handleRemoveBackground: (id: string) => void;
  handleRemoveAllBackgrounds: () => void;
}

const ImageProcessingContext = createContext<ImageProcessingContextProps | undefined>(undefined);

export function useImageProcessing() {
  const context = useContext(ImageProcessingContext);
  if (context === undefined) {
    throw new Error('useImageProcessing must be used within an ImageProcessingProvider');
  }
  return context;
}

interface ImageProcessingProviderProps {
  children: ReactNode;
  // Required props from parent
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: ImageAdjustments) => void;
  applyToAll: boolean;
  setApplyToAll: (value: boolean) => void;
  onReset?: () => void;
  selectedImageId: string | null;
  isProcessing: boolean;
  isRemovingBackground: boolean;
  hasBackgroundRemoved: boolean;
  totalImages: number;
  processedCount: number;
  onRemoveBackground: (id: string) => void;
  onRemoveAllBackgrounds: () => void;
}

export function ImageProcessingProvider({
  children,
  adjustments,
  onAdjustmentsChange,
  applyToAll,
  setApplyToAll,
  onReset,
  selectedImageId,
  isProcessing,
  isRemovingBackground,
  hasBackgroundRemoved,
  totalImages,
  processedCount,
  onRemoveBackground,
  onRemoveAllBackgrounds,
}: ImageProcessingProviderProps) {
  // Handle reset of adjustments
  const handleReset = () => {
    onAdjustmentsChange(defaultAdjustments);
    if (onReset) {
      onReset();
    }
  };

  // Create the context value
  const value = {
    // Image adjustment state
    adjustments,
    setAdjustments: onAdjustmentsChange,
    
    // Apply to all toggle
    applyToAll,
    setApplyToAll,
    
    // Background removal state
    selectedImageId,
    isProcessing,
    isRemovingBackground,
    hasBackgroundRemoved,
    totalImages,
    processedCount,
    
    // Action handlers
    handleReset,
    handleRemoveBackground: onRemoveBackground,
    handleRemoveAllBackgrounds: onRemoveAllBackgrounds,
  };

  return (
    <ImageProcessingContext.Provider value={value}>
      {children}
    </ImageProcessingContext.Provider>
  );
} 