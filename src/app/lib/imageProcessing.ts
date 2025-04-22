import { v4 as uuidv4 } from 'uuid';
import { ImageAdjustments } from '../components/ImageProcessingControls';
import { Preset } from '../components/PresetsSelector';
import { ImageFile } from '../components/ImagePreview';
import { WatermarkSettings, WatermarkPosition, defaultWatermarkSettings } from '../components/WatermarkControl';
import JSZip from 'jszip';
import { SeoProductDescription } from './gemini';

// Import the OpenCV type from our declaration file
declare global {
  interface Window {
   // Use the specific type from the declaration file
    // @ts-expect-error - Suppress conflict with potential global 'opencv' type
    cv: typeof cv;
  }
}

export const initOpenCV = (): Promise<void> => {
  return new Promise((resolve) => {
    // Check if OpenCV is already loaded
    if (window.cv && typeof window.cv.imread === 'function') {
      console.log('OpenCV already loaded');
      resolve();
      return;
    }

    // Set up an event listener for when OpenCV is ready
    const onOpenCvReady = () => {
      console.log('OpenCV ready event received');
      window.removeEventListener('opencv-ready', onOpenCvReady);
      resolve();
    };
    
    // Listen for the opencv-ready event from our loader script
    window.addEventListener('opencv-ready', onOpenCvReady);
    
    // If OpenCV is not available after 5 seconds, resolve anyway and use fallbacks
    const timeoutId = setTimeout(() => {
      console.warn('OpenCV.js loading timed out, using fallback methods');
      window.removeEventListener('opencv-ready', onOpenCvReady);
      resolve(); // Resolve anyway to continue with fallbacks
    }, 5000);
    
    // Clear the timeout if OpenCV loads successfully
    window.addEventListener('opencv-ready', () => clearTimeout(timeoutId), { once: true });
  });
};

// ============================================================
// IMAGE PROCESSING UTILITY FUNCTIONS 
// ============================================================

/**
 * Apply brightness and contrast adjustments to image data
 * This operates directly on the provided data array
 */
function applyBrightnessContrast(
  data: Uint8ClampedArray, 
  width: number, 
  height: number, 
  brightness: number, 
  contrast: number,
  skipTransparent: boolean = false
): void {
  if (brightness === 0 && contrast === 0) return;
  
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    // Skip fully transparent pixels if requested
    if (skipTransparent && data[i + 3] === 0) continue;
    
    // Apply brightness
    data[i] += brightness;     // R
    data[i + 1] += brightness; // G
    data[i + 2] += brightness; // B
    
    // Apply contrast
    data[i] = factor * (data[i] - 128) + 128;
    data[i + 1] = factor * (data[i + 1] - 128) + 128;
    data[i + 2] = factor * (data[i + 2] - 128) + 128;
    
    // Ensure values are within bounds
    data[i] = Math.max(0, Math.min(255, data[i]));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
  }
}

/**
 * Apply HSL adjustments to image data
 * This operates directly on the provided data array
 */
function applyHSLAdjustment(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  hue: number,
  saturation: number,
  lightness: number,
  skipTransparent: boolean = false
): void {
  if (hue === 100 && saturation === 100 && lightness === 100) return;
  
  // Calculate adjustment factors
  const hueShift = (hue - 100) * 3.6;      // Convert to degrees (-360 to +360)
  const satFactor = saturation / 100;       // 0-2 range
  const lightFactor = lightness / 100;      // 0-2 range
  
  for (let i = 0; i < data.length; i += 4) {
    // Skip fully transparent pixels if requested
    if (skipTransparent && data[i + 3] === 0) continue;
    
    // Convert RGB to HSL
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    // Apply hue shift (in 0-1 range)
    h = ((h * 360 + hueShift) % 360) / 360;
    if (h < 0) h += 1;
    
    // Apply saturation and lightness scaling
    s *= satFactor;
    if (s > 1) s = 1;
    
    l *= lightFactor;
    if (l > 1) l = 1;
    
    // Convert back to RGB
    let r1, g1, b1;
    
    if (s === 0) {
      r1 = g1 = b1 = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r1 = hue2rgb(p, q, h + 1/3);
      g1 = hue2rgb(p, q, h);
      b1 = hue2rgb(p, q, h - 1/3);
    }
    
    data[i] = Math.round(r1 * 255);
    data[i + 1] = Math.round(g1 * 255);
    data[i + 2] = Math.round(b1 * 255);
    // Alpha channel is preserved
  }
}

/**
 * Apply RGB channel adjustments to image data
 * This operates directly on the provided data array
 */
function applyRGBAdjustment(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  redScale: number,
  greenScale: number,
  blueScale: number,
  skipTransparent: boolean = false
): void {
  if (redScale === 1.0 && greenScale === 1.0 && blueScale === 1.0) {
    console.log("Skipping RGB adjustment - all scales are 1.0");
    return;
  }
  
  console.log("Applying RGB adjustments:", { redScale, greenScale, blueScale, width, height, skipTransparent });
  
  for (let i = 0; i < data.length; i += 4) {
    // Skip fully transparent pixels if requested
    if (skipTransparent && data[i + 3] === 0) continue;
    
    data[i] = Math.max(0, Math.min(255, data[i] * redScale));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * greenScale));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * blueScale));
  }
  
  console.log("RGB adjustment completed");
}

/**
 * Apply sharpening to image data
 * This requires a new buffer since it needs to read from the original pixels
 */
function applySharpen(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  skipTransparent: boolean = false
): void {
  if (amount <= 0) return;
  
  // Create a copy of the original data since we need to read from original values
  const tempData = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i++) {
    tempData[i] = data[i];
  }
  
  // Simple 3x3 sharpen kernel
  const strength = Math.min(amount, 2);
  const kernel = [
    0, -strength, 0,
    -strength, 1 + 4 * strength, -strength,
    0, -strength, 0
  ];
  
  // Apply convolution
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixelIndex = (y * width + x) * 4;
      
      // Skip fully transparent pixels if requested
      if (skipTransparent && data[pixelIndex + 3] === 0) continue;
      
      for (let c = 0; c < 3; c++) {  // Only process RGB channels
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            const pixelPos = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += tempData[pixelPos] * kernel[kernelIndex];
          }
        }
        
        data[pixelIndex + c] = Math.min(255, Math.max(0, sum));
      }
    }
  }
}

/**
 * Process image data with all adjustments
 * @param ctx Canvas context to process
 * @param adjustments Image adjustment settings
 * @param skipTransparent Whether to skip fully transparent pixels
 */
function processImageContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
  skipTransparent: boolean = false
): void {
  console.log("Processing image context with adjustments:", adjustments, "skipTransparent:", skipTransparent);
  
  // Get the image data once
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Apply adjustments directly to the image data
  applyBrightnessContrast(data, width, height, adjustments.brightness, adjustments.contrast, skipTransparent);
  applyHSLAdjustment(data, width, height, adjustments.hue, adjustments.saturation, adjustments.lightness, skipTransparent);
  applyRGBAdjustment(data, width, height, adjustments.redScale, adjustments.greenScale, adjustments.blueScale, skipTransparent);
  
  if (adjustments.sharpen > 0) {
    applySharpen(data, width, height, adjustments.sharpen, skipTransparent);
  }
  
  // Put the modified data back to the context
  ctx.putImageData(imageData, 0, 0);
  console.log("Image processing complete, data put back to context");
}

// ============================================================
// ORIGINAL CANVAS FUNCTIONS (SIMPLIFIED TO USE NEW UTILITIES)
// ============================================================

// Helper function to convert hue to RGB component
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

// ============================================================
// WATERMARK HELPER FUNCTIONS (Using Canvas API)
// ============================================================

/**
 * Loads an image from a data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
          const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Calculates the watermark dimensions based on settings and canvas size
 */
function getWatermarkDimensions( 
  watermarkElement: HTMLImageElement | { width: number, height: number }, 
  canvasWidth: number, 
  canvasHeight: number, 
  settings: WatermarkSettings
): { width: number, height: number } {
  const baseSize = Math.min(canvasWidth, canvasHeight) * (settings.size / 100);
  const aspectRatio = watermarkElement.width / watermarkElement.height;

  let width = baseSize;
  let height = baseSize / aspectRatio;

  // Ensure it doesn't exceed canvas boundaries (adjust if needed)
  if (width > canvasWidth * 0.9) { 
    width = canvasWidth * 0.9;
    height = width / aspectRatio;
  }
  if (height > canvasHeight * 0.9) {
    height = canvasHeight * 0.9;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Calculates the watermark position based on settings and dimensions
 */
function getWatermarkPosition(
  canvasWidth: number,
  canvasHeight: number,
  watermarkWidth: number,
  watermarkHeight: number,
  position: WatermarkPosition
): { x: number, y: number } {
  const margin = Math.min(canvasWidth, canvasHeight) * 0.02; // 2% margin

  switch (position) {
    case 'topLeft':
      return { x: margin, y: margin };
    case 'topRight':
      return { x: canvasWidth - watermarkWidth - margin, y: margin };
    case 'bottomLeft':
      return { x: margin, y: canvasHeight - watermarkHeight - margin };
    case 'center':
      return { x: (canvasWidth - watermarkWidth) / 2, y: (canvasHeight - watermarkHeight) / 2 };
    case 'diagonal': // For diagonal, we'll handle drawing differently
       return { x: 0, y: 0 }; // Placeholder, handled in drawing logic
    case 'tile': // For tile, we'll handle drawing differently
       return { x: 0, y: 0 }; // Placeholder, handled in drawing logic
    case 'bottomRight':
    default:
      return { x: canvasWidth - watermarkWidth - margin, y: canvasHeight - watermarkHeight - margin };
  }
}

/**
 * Applies the watermark to the canvas context
 */
async function applyWatermarkToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  settings: WatermarkSettings
): Promise<void> {
  if (!settings.enabled || !settings.type) return;

  ctx.globalAlpha = settings.opacity;

  if (settings.type === 'text') {
    // --- Text Watermark --- 
    const fontSize = Math.max(10, Math.min(canvasWidth, canvasHeight) * (settings.size / 100));
    ctx.font = `${fontSize}px ${settings.font}`;
    ctx.fillStyle = settings.textColor;
    ctx.textAlign = 'center'; // Default alignment
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(settings.text);
    // Approximate height - better ways exist but keep it simple for now
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    const textWidth = textMetrics.width;

    if (settings.position === 'tile') {
        // Tiling logic
        const tileWidth = textWidth * 1.5; 
        const tileHeight = textHeight * 3;
        for (let y = 0; y < canvasHeight + tileHeight; y += tileHeight) {
            for (let x = 0; x < canvasWidth + tileWidth; x += tileWidth) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 6); // Rotate slightly for tile
                ctx.fillText(settings.text, 0, 0);
                ctx.restore();
            }
        }
    } else if (settings.position === 'diagonal') {
        // Diagonal logic
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.rotate(-Math.PI / 4); // Rotate 45 degrees
        ctx.fillText(settings.text, 0, 0);
        ctx.restore();
    } else {
        const { x, y } = getWatermarkPosition(canvasWidth, canvasHeight, textWidth, textHeight, settings.position);
        // Adjust position based on textAlign/textBaseline for presets
        let finalX = x + textWidth / 2;
        const finalY = y + textHeight / 2;
         if (settings.position === 'topLeft') { ctx.textAlign = 'left'; finalX = x; } 
         if (settings.position === 'topRight') { ctx.textAlign = 'right'; finalX = x + textWidth; } 
         if (settings.position === 'bottomLeft') { ctx.textAlign = 'left'; finalX = x; }
         if (settings.position === 'bottomRight') { ctx.textAlign = 'right'; finalX = x + textWidth; }
        
        ctx.fillText(settings.text, finalX, finalY);
    }

  } else if (settings.type === 'logo' && settings.logoDataUrl) {
    // --- Logo Watermark --- 
    try {
      const logoImg = await loadImage(settings.logoDataUrl);
      const { width: logoDrawWidth, height: logoDrawHeight } = getWatermarkDimensions(logoImg, canvasWidth, canvasHeight, settings);

      if (settings.position === 'tile') {
          // Tiling logic
          const tileWidth = logoDrawWidth * 1.5;
          const tileHeight = logoDrawHeight * 1.5;
          for (let y = 0; y < canvasHeight + tileHeight; y += tileHeight) {
              for (let x = 0; x < canvasWidth + tileWidth; x += tileWidth) {
                  ctx.drawImage(logoImg, x, y, logoDrawWidth, logoDrawHeight);
              }
          }
      } else if (settings.position === 'diagonal') {
           // Diagonal - place in center for now, could be improved
           const { x, y } = getWatermarkPosition(canvasWidth, canvasHeight, logoDrawWidth, logoDrawHeight, 'center');
           ctx.drawImage(logoImg, x, y, logoDrawWidth, logoDrawHeight);
      } else {
          const { x, y } = getWatermarkPosition(canvasWidth, canvasHeight, logoDrawWidth, logoDrawHeight, settings.position);
          ctx.drawImage(logoImg, x, y, logoDrawWidth, logoDrawHeight);
      }
                } catch (error) {
      console.error("Error loading or drawing logo watermark:", error);
    }
  }

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

// ============================================================
// MAIN IMAGE PROCESSING FUNCTION (MODIFIED)
// ============================================================

/**
 * Process an image with adjustments, resizing, and optional watermarking.
 * Uses OpenCV for adjustments if available, otherwise falls back to Canvas API.
 */
export const processImage = async (
  imageFile: ImageFile, 
  adjustments: ImageAdjustments,
  preset: Preset | null,
  watermarkSettings: WatermarkSettings = defaultWatermarkSettings,
  processFullSize: boolean = false
): Promise<{ processedDataUrl?: string, processedThumbnailUrl: string }> => {
  console.log("processImage called with:", { 
      imageId: imageFile.id, 
      adjustments, 
      preset, 
      watermarkEnabled: watermarkSettings.enabled,
      watermarkType: watermarkSettings.type,
      processFullSize 
  });

  const sourceUrl = processFullSize ? imageFile.dataUrl : (imageFile.thumbnailDataUrl || imageFile.dataUrl);
  const originalThumbnail = imageFile.thumbnailDataUrl || imageFile.dataUrl;
  
  if (!sourceUrl) {
      console.error('No source URL available for processing image:', imageFile.id);
      return { processedThumbnailUrl: originalThumbnail }; 
  }

  try {
      const useOpenCV = typeof window.cv?.imread === 'function';

      // --- Inner processing function using Canvas --- 
      const processImageWithCanvas = async (sourceDataUrl: string, isFullSize: boolean): Promise<string> => {
          return new Promise(async (resolve, reject) => {
              const img = new Image();
              img.onload = async () => {
                  let targetWidth = img.width;
                  let targetHeight = img.height;

                  // Apply preset resizing if available
                  if (preset) {
                      if (preset.width && preset.height) {
                          targetWidth = preset.width;
                          targetHeight = preset.height;
                      } else if (preset.width) {
                          targetWidth = preset.width;
                          targetHeight = Math.round(img.height * (preset.width / img.width));
                      } else if (preset.height) { // Should not happen with current presets but handle anyway
                          targetHeight = preset.height;
                          targetWidth = Math.round(img.width * (preset.height / img.height));
                      }
                  } 
                   // For thumbnail generation, enforce max width if no preset
                  else if (!isFullSize && img.width > 800) { 
                      const scale = 800 / img.width;
                      targetWidth = 800;
                      targetHeight = Math.round(img.height * scale);
                  }

                  const canvas = document.createElement('canvas');
                  canvas.width = targetWidth;
                  canvas.height = targetHeight;
                  const ctx = canvas.getContext('2d', { willReadFrequently: true });

                  if (!ctx) {
                      reject(new Error('Could not get canvas context'));
                      return;
                  }

                  // Draw the original image onto the canvas, resizing if necessary
                  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                  
                  // --- Apply Adjustments using Canvas API --- 
                  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                  const data = imageData.data;
                  const skipTransparent = imageFile.backgroundRemoved || false;

                  applyBrightnessContrast(data, targetWidth, targetHeight, adjustments.brightness, adjustments.contrast, skipTransparent);
                  applyHSLAdjustment(data, targetWidth, targetHeight, adjustments.hue, adjustments.saturation, adjustments.lightness, skipTransparent);
                  applyRGBAdjustment(data, targetWidth, targetHeight, adjustments.redScale, adjustments.greenScale, adjustments.blueScale, skipTransparent);
                  applySharpen(data, targetWidth, targetHeight, adjustments.sharpen, skipTransparent); // Sharpen last
                  
                  // Put the modified data back onto the canvas
                  ctx.putImageData(imageData, 0, 0);
                  
                  // --- Apply Watermark --- 
                  if (watermarkSettings.enabled) {
                      try {
                          await applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkSettings);
                          console.log("Watermark applied successfully for image:", imageFile.id);
                      } catch (watermarkError) {
                          console.error("Error applying watermark:", watermarkError);
                      }
                  }

                  // Get the final data URL with specified quality
                  const quality = preset ? preset.quality / 100 : 0.85; // Default 85% quality
                  const format = imageFile.backgroundRemoved ? 'image/png' : 'image/jpeg'; // Use PNG for transparency
                  resolve(canvas.toDataURL(format, quality)); 
              };
              img.onerror = reject;
              img.src = sourceDataUrl;
          });
      };
      
      // --- Inner processing function using OpenCV --- 
       const processImageWithOpenCV = (sourceDataUrl: string, isFullSize: boolean): Promise<string> => {
           return new Promise(async (resolve, reject) => {
               const img = new Image();
               img.onload = async () => {
                    let src = window.cv.imread(img);
                    let targetWidth = src.cols;
                    let targetHeight = src.rows;

                   // Apply preset resizing if available
                  if (preset) {
                      if (preset.width && preset.height) {
                          targetWidth = preset.width;
                          targetHeight = preset.height;
                      } else if (preset.width) {
                          targetWidth = preset.width;
                          targetHeight = Math.round(src.rows * (preset.width / src.cols));
                      } else if (preset.height) { // Should not happen but handle anyway
                          targetHeight = preset.height;
                          targetWidth = Math.round(src.cols * (preset.height / src.rows));
                      }
                      
                      if (targetWidth !== src.cols || targetHeight !== src.rows) {
                          const dsize = new window.cv.Size(targetWidth, targetHeight);
                          const resizedSrc = new window.cv.Mat();
                          window.cv.resize(src, resizedSrc, dsize, 0, 0, window.cv.INTER_AREA);
                          src.delete(); // Delete the old mat
                          src = resizedSrc; // Assign the resized mat
                      }
                  } 
                   // For thumbnail generation, enforce max width if no preset
                  else if (!isFullSize && src.cols > 800) { 
                       const scale = 800 / src.cols;
                       targetWidth = 800;
                       targetHeight = Math.round(src.rows * scale);
                       const dsize = new window.cv.Size(targetWidth, targetHeight);
                       const resizedSrc = new window.cv.Mat();
                       window.cv.resize(src, resizedSrc, dsize, 0, 0, window.cv.INTER_AREA);
                       src.delete();
                       src = resizedSrc;
                  }
                  
                  const canvas = document.createElement('canvas');
                  canvas.width = targetWidth;
                  canvas.height = targetHeight;
                  
                  // --- Apply OpenCV Adjustments --- 
                  const processedMat = processWithOpenCVAdjustments(src, adjustments, imageFile.backgroundRemoved);
                  
                  // Draw processed OpenCV Mat to Canvas
                  window.cv.imshow(canvas, processedMat);
                  processedMat.delete(); // Clean up the processed matrix
                  src.delete(); // Clean up the source matrix
                  
                   // --- Apply Watermark (on the Canvas AFTER OpenCV) --- 
                  if (watermarkSettings.enabled) {
                       const ctx = canvas.getContext('2d');
                       if (ctx) {
                           try {
                              await applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkSettings);
                              console.log("Watermark applied successfully (OpenCV path) for image:", imageFile.id);
                           } catch (watermarkError) {
                              console.error("Error applying watermark (OpenCV path):", watermarkError);
                           }
                       } else {
                           console.error("Could not get canvas context for watermarking after OpenCV processing.");
                       }
                  }
                  
                  // Get final data URL
                  const quality = preset ? preset.quality / 100 : 0.85; 
                  const format = imageFile.backgroundRemoved ? 'image/png' : 'image/jpeg';
                  resolve(canvas.toDataURL(format, quality));
               };
               img.onerror = reject;
               img.src = sourceDataUrl;
           });
       };

      // Determine which processing function to use
      const processFunction = useOpenCV ? processImageWithOpenCV : processImageWithCanvas;

      // --- Execute Processing --- 
      let processedDataUrl: string | undefined;
      let thumbnailResultUrl: string | undefined; // Renamed variable

      // Always process thumbnail first
      try {
        thumbnailResultUrl = await processFunction(originalThumbnail, false);
      } catch (thumbError) {
        console.error('Error processing thumbnail for image:', imageFile.id, thumbError);
        thumbnailResultUrl = originalThumbnail; // Fallback to original on thumb error
      }
      
      // Ensure thumbnailResultUrl is a string
      const finalThumbnailUrl = thumbnailResultUrl || originalThumbnail;

      // Process full size only if requested (for download)
      if (processFullSize) {
          try {
            processedDataUrl = await processFunction(imageFile.dataUrl, true);
          } catch (fullSizeError) {
             console.error('Error processing full size image:', imageFile.id, fullSizeError);
             // processedDataUrl remains undefined
          }
      }

      console.log("Processing complete for image:", imageFile.id, { hasFullSize: !!processedDataUrl });

      return {
          processedDataUrl,
          processedThumbnailUrl: finalThumbnailUrl // Assign the definite string value
      };

  } catch (error) {
      console.error('Error processing image:', imageFile.id, error);
      return { processedThumbnailUrl: originalThumbnail }; 
  }
};

// ============================================================
// OpenCV Specific Adjustment Function (Refactored)
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
function processWithOpenCVAdjustments(srcMat: any, adjustments: ImageAdjustments, isTransparent: boolean = false): any { // Allow 'any' return type due to OpenCV.js typing
   let dst = srcMat.clone(); // Work on a copy

  // --- Brightness/Contrast --- 
  if (adjustments.brightness !== 0 || adjustments.contrast !== 0) {
    const temp = new window.cv.Mat();
    const alpha = (adjustments.contrast / 100.0) + 1.0; // Contrast factor (1.0 - 2.0)
    const beta = adjustments.brightness;              // Brightness offset (-100 to 100)
    dst.convertTo(temp, -1, alpha, beta); 
    dst.delete();
    dst = temp;
  }

  // --- HSL Adjustments --- 
  if (adjustments.hue !== 100 || adjustments.saturation !== 100 || adjustments.lightness !== 100) {
    const hls = new window.cv.Mat();
    window.cv.cvtColor(dst, hls, window.cv.COLOR_BGR2HLS);

    const hueShift = (adjustments.hue - 100);        
    const satScale = adjustments.saturation / 100.0;  
    const lightScale = adjustments.lightness / 100.0; 

    for (let i = 0; i < hls.rows; i++) {
      for (let j = 0; j < hls.cols; j++) {
         // @ts-expect-error // ucharPtr might not be in basic types
         const pixel = hls.ucharPtr(i, j);
         if (isTransparent && srcMat.channels() === 4 && srcMat.ucharPtr(i, j)[3] === 0) {
           continue;
         }

        let h = pixel[0];
        h = (h + (hueShift * 180 / 200) + 180) % 180; 
        pixel[0] = h;

        let l = pixel[1];
        l = Math.min(255, Math.max(0, l * lightScale));
        pixel[1] = l;

        let s = pixel[2];
        s = Math.min(255, Math.max(0, s * satScale));
        pixel[2] = s;
      }
    }

    window.cv.cvtColor(hls, dst, window.cv.COLOR_HLS2BGR);
    hls.delete();
  }

   // --- RGB Scaling --- 
   if (adjustments.redScale !== 1.0 || adjustments.greenScale !== 1.0 || adjustments.blueScale !== 1.0) {
       const channels = new window.cv.MatVector();
       window.cv.split(dst, channels); 
       const b = channels.get(0);
       const g = channels.get(1);
       const r = channels.get(2);
       
       const bScalar = new window.cv.Mat(dst.rows, dst.cols, window.cv.CV_8U, new window.cv.Scalar(adjustments.blueScale));
       const gScalar = new window.cv.Mat(dst.rows, dst.cols, window.cv.CV_8U, new window.cv.Scalar(adjustments.greenScale));
       const rScalar = new window.cv.Mat(dst.rows, dst.cols, window.cv.CV_8U, new window.cv.Scalar(adjustments.redScale));
       
       for (let i = 0; i < dst.rows; i++) {
         for (let j = 0; j < dst.cols; j++) {
           if (isTransparent && srcMat.channels() === 4 && srcMat.ucharPtr(i, j)[3] === 0) {
              continue;
           }
           // @ts-expect-error // ucharPtr might not be in basic types
           b.ucharPtr(i, j)[0] = Math.min(255, Math.max(0, b.ucharPtr(i, j)[0] * adjustments.blueScale));
           // @ts-expect-error // ucharPtr might not be in basic types
           g.ucharPtr(i, j)[0] = Math.min(255, Math.max(0, g.ucharPtr(i, j)[0] * adjustments.greenScale));
           // @ts-expect-error // ucharPtr might not be in basic types
           r.ucharPtr(i, j)[0] = Math.min(255, Math.max(0, r.ucharPtr(i, j)[0] * adjustments.redScale));
         }
       }
       
       // @ts-expect-error // merge signature discrepancy (MatVector type)
       window.cv.merge(channels, dst);
       
       channels.delete();
       b.delete(); g.delete(); r.delete();
       bScalar.delete(); gScalar.delete(); rScalar.delete();
   }

  // --- Sharpen --- 
  if (adjustments.sharpen > 0) {
      const blurred = new window.cv.Mat();
      const sharpened = new window.cv.Mat();
      // @ts-expect-error // GaussianBlur might not be in basic types
      window.cv.GaussianBlur(dst, blurred, new window.cv.Size(0, 0), 3);
      // @ts-expect-error // addWeighted might not be in basic types
      window.cv.addWeighted(dst, 1.0 + adjustments.sharpen, blurred, -adjustments.sharpen, 0, sharpened);
      dst.delete();
      dst = sharpened;
      blurred.delete();
  }

  return dst;
}

export const createThumbnail = (dataUrl: string, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        // Check if this is a PNG with transparency
        const isPng = dataUrl.startsWith('data:image/png');
        
        // Calculate thumbnail dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        // Resize by the larger dimension to 800px
        if (width >= height && width > maxWidth) {
          const aspectRatio = height / width;
          width = maxWidth;
          height = Math.round(width * aspectRatio);
        } else if (height > width && height > maxWidth) {
          const aspectRatio = width / height;
          height = maxWidth;
          width = Math.round(height * aspectRatio);
        }
        
        // Create a canvas to draw the thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Get context with alpha channel support for PNGs
        const ctx = canvas.getContext('2d', { alpha: true })!;
        
        // Use better image rendering quality
        ctx.imageSmoothingQuality = 'high';
        
        // For PNGs, clear the canvas to ensure transparency is preserved
        if (isPng) {
          ctx.clearRect(0, 0, width, height);
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // For PNGs, return PNG format to preserve transparency
        if (isPng) {
          const thumbnailDataUrl = canvas.toDataURL('image/png', 1.0);
          resolve(thumbnailDataUrl);
        } else {
          // For JPGs, use JPEG format
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve(thumbnailDataUrl);
        }
      };
      
      img.onerror = () => reject(new Error('Error creating thumbnail'));
      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });
};

export const createImageFile = async (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        
        // Create a thumbnail version for faster previews
        const thumbnailDataUrl = await createThumbnail(dataUrl);
        
        resolve({
          id: uuidv4(),
          file,
          dataUrl,
          thumbnailDataUrl,
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export type ImageFormat = 'jpg' | 'webp' | 'png';

// Update downloadImage function to support format selection and SEO-friendly filenames
export const downloadImage = (
  dataUrl: string, 
  filename: string, 
  format: ImageFormat = 'jpg', 
  seoName?: string, 
  adjustments?: ImageAdjustments
): void => {
  // If SEO name is provided, use it instead of the original filename
  let finalFilename = filename;
  
  if (seoName) {
    // Create the new filename with SEO name and format extension
    finalFilename = `${seoName}.${format}`;
  } else {
    // Keep the original name but ensure correct extension for format conversion
    finalFilename = finalFilename.replace(/\.(jpg|jpeg|png|webp)$/i, `.${format}`);
  }
  
  // If format is already in the desired format, download directly
  if ((format === 'jpg' && dataUrl.includes('image/jpeg')) || 
      (format === 'webp' && dataUrl.includes('image/webp')) ||
      (format === 'png' && dataUrl.includes('image/png'))) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  
  // Try to use OpenCV if available
  if (window.cv && typeof window.cv.imread === 'function') {
    console.log('Using OpenCV for format conversion');
    
    const img = new Image();
    img.onload = () => {
      try {
        // Create a temporary canvas to load the image for OpenCV
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        
        const tempCtx = tempCanvas.getContext('2d', { alpha: true });
        if (!tempCtx) {
          throw new Error('Failed to get canvas context');
        }
        
        // Clear canvas first to ensure transparency is preserved
        tempCtx.clearRect(0, 0, img.width, img.height);
        tempCtx.drawImage(img, 0, 0);
        
        // Apply adjustments if provided
        if (adjustments) {
          console.log('Applying adjustments during OpenCV format conversion:', adjustments);
          processImageContext(tempCtx, img.width, img.height, adjustments, false);
        }
        
        // Read the image into an OpenCV Mat
        const src = window.cv.imread(tempCanvas);
        
        // Create a result canvas
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = img.width;
        resultCanvas.height = img.height;
        
        // Process with OpenCV - we'll use a simpler approach to avoid linter errors
        try {
          // Display the OpenCV processed image on our result canvas
          window.cv.imshow(resultCanvas, src);
          
          // Clean up
          src.delete();
          
          // Convert to the desired format using Canvas API
          const mimeType = format === 'webp' ? 'image/webp' : 
                          format === 'png' ? 'image/png' : 'image/jpeg';
          
          // PNG needs full quality for transparency
          const quality = format === 'png' ? 1.0 : 
                        format === 'webp' ? 0.8 : 0.9; 
          
          const convertedDataUrl = resultCanvas.toDataURL(mimeType, quality);
          
          // Create download link
          const link = document.createElement('a');
          link.href = convertedDataUrl;
          link.download = finalFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.error('Error during OpenCV processing', e);
          src.delete();
          throw e;
        }
      } catch (e) {
        console.error('OpenCV format conversion failed, falling back to Canvas API', e);
        // Fall back to canvas-based conversion
        canvasFormatConversion(dataUrl, finalFilename, format, adjustments);
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image for OpenCV conversion');
      // Fall back to canvas-based conversion
      canvasFormatConversion(dataUrl, finalFilename, format, adjustments);
    };
    
    img.src = dataUrl;
  } else {
    // Fall back to canvas-based conversion if OpenCV is not available
    canvasFormatConversion(dataUrl, finalFilename, format, adjustments);
  }
};

// Helper function for canvas-based format conversion
function canvasFormatConversion(
  dataUrl: string | HTMLImageElement, 
  finalFilename: string, 
  format: ImageFormat,
  adjustments?: ImageAdjustments
): void {
  const processImage = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    // Clear the canvas first to ensure transparency is preserved
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image
    ctx.drawImage(img, 0, 0);
    
    // Apply adjustments if provided
    if (adjustments) {
      console.log('Applying adjustments during format conversion:', adjustments);
      processImageContext(ctx, canvas.width, canvas.height, adjustments, false);
    }
    
    // Convert to the desired format
    const mimeType = format === 'webp' ? 'image/webp' : 
                    format === 'png' ? 'image/png' : 'image/jpeg';
    
    // PNG needs full quality for transparency
    const quality = format === 'png' ? 1.0 : 
                  format === 'webp' ? 0.8 : 0.9; 
    
    const convertedDataUrl = canvas.toDataURL(mimeType, quality);
    
    // Create download link
    const link = document.createElement('a');
    link.href = convertedDataUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If we already have an image element
  if (dataUrl instanceof HTMLImageElement) {
    processImage(dataUrl);
    return;
  }

  // Otherwise, we have a dataURL string
  const img = new Image();
  img.onload = () => processImage(img);
  img.src = dataUrl as string;
}

// Download all images with format selection and ZIP option
export const downloadAllImages = async (
  images: ImageFile[], 
  format: ImageFormat = 'jpg', 
  asZip: boolean = false,
  seoProductDescription: SeoProductDescription | null = null,
  adjustments?: ImageAdjustments
): Promise<void> => {
  if (images.length === 0) return;
  
  // If there's only one image and we don't need a zip, download it directly
  if (images.length === 1 && !asZip && !seoProductDescription) {
    const image = images[0];
    const dataUrl = image.processedDataUrl || image.dataUrl;
    const sourceFilename = image.file.name;
    const seoName = image.seoName;
    
    if (image.backgroundRemoved) {
      // Always use PNG for transparent images
      downloadImage(dataUrl, sourceFilename, 'png', seoName, adjustments);
    } else {
      downloadImage(dataUrl, sourceFilename, format, seoName, adjustments);
    }
    return;
  }
  
  // Create a ZIP file with all images
  const zip = new JSZip();
  
  // Create a directory for the images
  const imagesDir = zip.folder("images");
  
  if (!imagesDir) {
    console.error("Failed to create images directory in ZIP");
    return;
  }
  
  // Add each image to the ZIP file
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const dataUrl = image.processedDataUrl || image.dataUrl;
    const originalFilename = image.file.name;
    const seoName = image.seoName;
    
    // Use PNG format for images with removed backgrounds
    const imageFormat = image.backgroundRemoved ? 'png' : format;
    
    try {
      await convertImageAndAddToZip(
        dataUrl, 
        imagesDir, 
        imageFormat, 
        i, 
        originalFilename, 
        seoName,
        adjustments
      );
    } catch (err) {
      console.error(`Error adding image ${i} to ZIP:`, err);
    }
  }
  
  // Add SEO product description to ZIP if provided
  if (seoProductDescription) {
    // Create a directory for the SEO product description
    const seoDir = zip.folder("seo-description");
    
    if (seoDir) {
      // Create content for the SEO product description text file
      let content = '';
      content += `PRODUCT TITLE:\n${seoProductDescription.productTitle}\n\n`;
      content += `META TITLE:\n${seoProductDescription.metaTitle}\n\n`;
      content += `META DESCRIPTION:\n${seoProductDescription.metaDescription}\n\n`;
      content += `SHORT DESCRIPTION:\n${seoProductDescription.shortDescription}\n\n`;
      content += `LONG DESCRIPTION:\n${seoProductDescription.longDescription}\n\n`;
      content += `CATEGORIES:\n${seoProductDescription.categories.join(' > ')}\n\n`;
      content += `TAGS:\n${seoProductDescription.tags.join(', ')}\n\n`;
      content += `URL SLUG:\n${seoProductDescription.urlSlug}\n\n`;
      
      // Add the text file to the ZIP
      seoDir.file("product-description.txt", content);
    }
  }
  
  // Generate the ZIP file and trigger download
  zip.generateAsync({ type: "blob" })
    .then(function(content) {
      // Create a download link
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `batchshots.com-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }, 100);
    })
    .catch(function(err) {
      console.error("Error generating ZIP file:", err);
    });
};

// Helper function to convert an image to the desired format and add it to the ZIP file
async function convertImageAndAddToZip(
  dataUrl: string, 
  zip: JSZip | { file: (name: string, data: string, options?: JSZip.JSZipFileOptions) => JSZip }, 
  format: ImageFormat, 
  index: number, 
  originalFilename: string, 
  seoName?: string,
  adjustments?: ImageAdjustments
): Promise<void> {
  return new Promise<void>((resolve /*, reject */) => {
    try {
      // Create an image element to load the data URL
      const img = new Image();
      
      img.onload = function() {
        try {
          // Create a canvas to draw the image and apply format conversion
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Could not get 2D context for canvas');
            resolve(); // Resolve anyway to continue with other images
            return;
          }
          
          // For PNG, we need to preserve transparency
          if (format === 'png') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          
          // Draw the image to the canvas
          ctx.drawImage(img, 0, 0);
          
          // Apply adjustments if provided
          if (adjustments) {
            console.log(`Applying adjustments to image ${index} for ZIP:`, adjustments);
            processImageContext(ctx, canvas.width, canvas.height, adjustments, format === 'png');
          }
          
          // Convert to the desired format
          let finalDataUrl: string;
          let extension: string;
          
          switch (format) {
            case 'webp':
              finalDataUrl = canvas.toDataURL('image/webp', 0.9);
              extension = 'webp';
              break;
            case 'png':
              finalDataUrl = canvas.toDataURL('image/png');
              extension = 'png';
              break;
            case 'jpg':
            default:
              finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              extension = 'jpg';
              break;
          }
          
          // Extract base64 content from data URL
          const base64Data = finalDataUrl.split(',')[1];
          
          // Generate filename (use SEO name if available)
          let filename: string;
          
          if (seoName) {
            filename = `${seoName}.${extension}`;
          } else {
            // Replace or remove file extension from original filename
            const nameWithoutExtension = originalFilename.replace(/\.[^/.]+$/, '');
            filename = `${nameWithoutExtension}_${index + 1}.${extension}`;
          }
          
          // Add file to ZIP
          zip.file(filename, base64Data, { base64: true });
          
          resolve();
        } catch (err) {
          console.error('Error converting image for ZIP:', err);
          resolve(); // Resolve anyway to continue with other images
        }
      };
      
      img.onerror = function() {
        console.error('Error loading image data URL');
        resolve(); // Resolve anyway to continue with other images
      };
      
      img.src = dataUrl;
    } catch (err) {
      console.error('Error in convertImageAndAddToZip:', err);
      resolve(); // Resolve anyway to continue with other images
    }
  });
} 