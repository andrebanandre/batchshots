'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ImageAdjustments, defaultAdjustments } from '../components/ImageProcessingControls';
import { WatermarkSettings, defaultWatermarkSettings } from '../components/WatermarkControl';

interface ImageProcessingContextProps {
  // Image adjustment state
  adjustments: ImageAdjustments;
  setAdjustments: React.Dispatch<React.SetStateAction<ImageAdjustments>>;
  
  // Watermark state
  watermarkSettings: WatermarkSettings;
  setWatermarkSettings: React.Dispatch<React.SetStateAction<WatermarkSettings>>;
  
  // Apply to all toggle
  applyToAll: boolean;
  setApplyToAll: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Processing state
  isProcessing: boolean;
  
  // Action handlers
  handleReset: () => void;
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
  onAdjustmentsChange: React.Dispatch<React.SetStateAction<ImageAdjustments>>;
  watermarkSettings: WatermarkSettings;
  onWatermarkSettingsChange: React.Dispatch<React.SetStateAction<WatermarkSettings>>;
  applyToAll: boolean;
  setApplyToAll: React.Dispatch<React.SetStateAction<boolean>>;
  onReset: () => void;
  isProcessing: boolean;
}

export const ImageProcessingProvider: React.FC<ImageProcessingProviderProps> = ({
  children,
  adjustments,
  onAdjustmentsChange,
  watermarkSettings,
  onWatermarkSettingsChange,
  applyToAll,
  setApplyToAll,
  onReset,
  isProcessing
}) => {
  // Handle reset of adjustments AND watermarks within the provider
  const handleReset = () => {
    onAdjustmentsChange(defaultAdjustments);
    onWatermarkSettingsChange(defaultWatermarkSettings); // Reset watermark via passed setter
    if (onReset) {
      onReset(); // Call original reset from parent if needed (e.g., for presets)
    }
  };

  // Create the context value, passing down the combined reset handler
  const contextValue = {
    // Image adjustment state
    adjustments,
    setAdjustments: onAdjustmentsChange,
    
    // Watermark state
    watermarkSettings,
    setWatermarkSettings: onWatermarkSettingsChange,
    
    // Apply to all toggle
    applyToAll,
    setApplyToAll,
    
    // Processing state
    isProcessing,
    
    // Action handlers
    handleReset, // Use the combined reset handler
  };

  return (
    <ImageProcessingContext.Provider value={contextValue}>
      {children}
    </ImageProcessingContext.Provider>
  );
}; 