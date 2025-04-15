import { v4 as uuidv4 } from 'uuid';
import { ImageAdjustments } from '../components/ImageProcessingControls';
import { Preset } from '../components/PresetsSelector';
import { ImageFile } from '../components/ImagePreview';
import JSZip from 'jszip';
import { SeoProductDescription } from './gemini';

// Import the OpenCV type from our declaration file
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any; // Using any for OpenCV as it's a complex external library
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

export const processImage = async (
  imageFile: ImageFile, 
  adjustments: ImageAdjustments,
  preset: Preset | null,
  processFullSize: boolean = false // Only process full-size when downloading
): Promise<{ processedDataUrl?: string, processedThumbnailUrl: string }> => {
  return new Promise((resolve, reject) => {
    try {
      // Safety check for adjustments
      const safeAdjustments = {
        brightness: adjustments.brightness || 0,
        contrast: adjustments.contrast || 0,
        redScale: adjustments.redScale || 1.0,
        greenScale: adjustments.greenScale || 1.0,
        blueScale: adjustments.blueScale || 1.0,
        sharpen: adjustments.sharpen || 0,
        saturation: adjustments.saturation || 100,
        hue: adjustments.hue || 100,
        lightness: adjustments.lightness || 100
      };
      
      // Process an image from a source data URL
      const processImageWithSource = (sourceDataUrl: string, isFullSize: boolean): Promise<string> => {
        return new Promise((resolveImg, rejectImg) => {
          const img = new Image();
          
          img.onload = () => {
            try {
              // Check if this is a PNG with transparency (for background-removed images)
              const isPngWithTransparency = sourceDataUrl.startsWith('data:image/png') && 
                                        imageFile.backgroundRemoved;
              
              let width = img.width;
              let height = img.height;
              
              // Apply preset dimensions if provided and we're processing the full image
              if (preset && isFullSize) {
                width = preset.width;
                if (!preset.height) {
                  // Maintain aspect ratio
                  const aspectRatio = img.height / img.width;
                  height = Math.round(width * aspectRatio);
                } else {
                  height = preset.height;
                }
              }
              
              // Create a canvas for processing
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d', { 
                // Use alpha for transparent PNGs
                alpha: true
              })!;
              
              // For transparent images, clear canvas before drawing
              if (isPngWithTransparency) {
                ctx.clearRect(0, 0, width, height);
              }
              
              // Draw the original image (resizing if needed)
              ctx.drawImage(img, 0, 0, width, height);
              
              // For transparent images with background removed, handle specially
              if (isPngWithTransparency) {
                // Apply adjustments that won't destroy transparency
                
                // First check if we have the "white background" adjustment
                // (When redScale, greenScale, and blueScale are all significantly above 1.0)
                const isWhiteBackgroundEffect = 
                  safeAdjustments.redScale > 1.2 && 
                  safeAdjustments.greenScale > 1.2 && 
                  safeAdjustments.blueScale > 1.2;
                
                // Log the resize dimensions being applied
                if (preset && isFullSize) {
                  console.log(`Applying resize to transparent image: ${width}x${height}`);
                }
                
                if (isWhiteBackgroundEffect) {
                  // Apply white background (fill with white and draw image on top with original alpha)
                  // No need to get imageData here
                  const newCanvas = document.createElement('canvas');
                  newCanvas.width = width;
                  newCanvas.height = height;
                  const newCtx = newCanvas.getContext('2d', { alpha: true })!;
                  
                  // Fill with white
                  newCtx.fillStyle = 'white';
                  newCtx.fillRect(0, 0, width, height);
                  
                  // Draw the image with its alpha
                  newCtx.drawImage(img, 0, 0, width, height);
                  
                  // Return as JPEG since we no longer need transparency
                  const quality = preset && isFullSize ? preset.quality / 100 : 0.95;
                  const dataUrl = newCanvas.toDataURL('image/jpeg', quality);
                  resolveImg(dataUrl);
                  return;
                } else {
                  // DEBUG - Log adjustments being applied
                  console.log("Applying adjustments to transparent PNG:", safeAdjustments);
                  
                  // Process all adjustments at once, preserving transparency
                  processImageContext(ctx, width, height, safeAdjustments, true);
                  
                  // Return as PNG to preserve transparency
                  const dataUrl = canvas.toDataURL('image/png', 1.0);
                  resolveImg(dataUrl);
                  return;
                }
              }
              
              // Try to use OpenCV if available, otherwise fall back to canvas methods
              if (window.cv && typeof window.cv.imread === 'function') {
                try {
                  console.log(`Using OpenCV for image processing (${isFullSize ? 'full' : 'thumbnail'})`);
                  const processedCanvas = processWithOpenCV(canvas, safeAdjustments);
                  // Higher quality for thumbnails
                  const quality = preset && isFullSize ? preset.quality / 100 : 0.95;
                  const dataUrl = processedCanvas.toDataURL('image/jpeg', quality);
                  resolveImg(dataUrl);
                  return;
                } catch (error) {
                  console.warn('OpenCV processing failed, falling back to Canvas API', error);
                  // Continue with canvas-based processing
                }
              }
              
              // Process with Canvas API
              console.log(`Using Canvas API for image processing (${isFullSize ? 'full' : 'thumbnail'})`);
              
              // Set high quality smoothing
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              // Process all adjustments at once using the unified function
              processImageContext(ctx, width, height, safeAdjustments, false);
              
              // Convert to data URL with quality setting
              const quality = preset && isFullSize ? preset.quality / 100 : 0.95;
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              resolveImg(dataUrl);
            } catch (err) {
              rejectImg(err);
            }
          };
          
          img.onerror = () => rejectImg(new Error('Error loading image'));
          img.src = sourceDataUrl;
        });
      };
      
      // Process images asynchronously
      const processAsync = async () => {
        try {
          // Process the thumbnail version for immediate preview
          const thumbnailSource = imageFile.thumbnailDataUrl || imageFile.dataUrl;
          const processedThumbnailUrl = await processImageWithSource(thumbnailSource, false);
          
          // If we need the full-size image, process it as well
          let processedDataUrl: string | undefined;
          if (processFullSize) {
            processedDataUrl = await processImageWithSource(imageFile.dataUrl, true);
          }
          
          resolve({
            processedThumbnailUrl,
            processedDataUrl
          });
        } catch (error) {
          reject(error);
        }
      };
      
      processAsync();
    } catch (error) {
      reject(error);
    }
  });
};

// OpenCV-based processing
function processWithOpenCV(canvas: HTMLCanvasElement, adjustments: ImageAdjustments): HTMLCanvasElement {
  try {
    console.log('🔄 OpenCV Processing with adjustments:', adjustments);
    
    // Create an OpenCV matrix from the canvas
    const src = window.cv.imread(canvas);
    
    // Apply HSL adjustments (using HLS in OpenCV)
    const hasHSLAdjustments = 
      adjustments.hue !== 100 || 
      adjustments.saturation !== 100 || 
      adjustments.lightness !== 100;
      
    if (hasHSLAdjustments) {
      try {
        console.log('🔄 OpenCV HLS Adjustment:', {
          hue: adjustments.hue, 
          saturation: adjustments.saturation, 
          lightness: adjustments.lightness
        });
        
        // Convert BGR to HLS
        const hls = new window.cv.Mat();
        // @ts-expect-error - OpenCV.js API doesn't match TypeScript definitions
        window.cv.cvtColor(src, hls, window.cv.COLOR_BGR2HLS);
        
        // Split channels
        const channels = new window.cv.MatVector();
        window.cv.split(hls, channels);
        
        // Get individual channels
        const hChannel = channels.get(0);  // Hue: 0-180
        const lChannel = channels.get(1);  // Lightness: 0-255
        const sChannel = channels.get(2);  // Saturation: 0-255
        
        // Adjust hue (add offset, keep within 0-180)
        const hueOffset = (adjustments.hue - 100) * 180 / 100;
        if (hueOffset !== 0) {
          // @ts-expect-error - Scalar can accept a single value in OpenCV.js
          const hueShiftMat = new window.cv.Mat(hChannel.rows, hChannel.cols, hChannel.type(), 
            // @ts-expect-error - Scalar can accept a single value in OpenCV.js
            new window.cv.Scalar(hueOffset));
          // @ts-expect-error - OpenCV.js API doesn't match TypeScript definitions
          window.cv.add(hChannel, hueShiftMat, hChannel);
          
          // Ensure hue values stay within 0-180 range
          // @ts-expect-error - Scalar can accept a single value in OpenCV.js
          const upperBound = new window.cv.Mat(hChannel.rows, hChannel.cols, hChannel.type(), 
            // @ts-expect-error - Scalar can accept a single value in OpenCV.js
            new window.cv.Scalar(180));
          // @ts-expect-error - Scalar can accept a single value in OpenCV.js
          const lowerBound = new window.cv.Mat(hChannel.rows, hChannel.cols, hChannel.type(), 
            // @ts-expect-error - Scalar can accept a single value in OpenCV.js
            new window.cv.Scalar(0));
          
          // @ts-expect-error - OpenCV.js API doesn't match TypeScript definitions
          window.cv.min(hChannel, upperBound, hChannel);
          // @ts-expect-error - OpenCV.js API doesn't match TypeScript definitions
          window.cv.max(hChannel, lowerBound, hChannel);
          
          hueShiftMat.delete();
          upperBound.delete();
          lowerBound.delete();
        }
        
        // Adjust saturation (scale values)
        const satScale = adjustments.saturation / 100;
        if (satScale !== 1) {
          sChannel.convertTo(sChannel, -1, satScale, 0);
        }
        
        // Adjust lightness (scale values)
        const lightScale = adjustments.lightness / 100;
        if (lightScale !== 1) {
          lChannel.convertTo(lChannel, -1, lightScale, 0);
        }
        
        // Merge channels back
        window.cv.merge(channels, hls);
        
        // Convert back to BGR
        window.cv.cvtColor(hls, src, window.cv.COLOR_HLS2BGR);
        
        // Clean up
        hls.delete();
        channels.delete();
        hChannel.delete();
        lChannel.delete();
        sChannel.delete();
        
      } catch (e) {
        console.error('OpenCV HLS adjustment failed:', e);
      }
    }
    
    // Apply RGB adjustments - THIS IS THE NEW CODE
    const hasRGBAdjustments = 
      adjustments.redScale !== 1.0 || 
      adjustments.greenScale !== 1.0 || 
      adjustments.blueScale !== 1.0;
    
    if (hasRGBAdjustments) {
      try {
        console.log('🔄 OpenCV RGB Adjustment:', {
          redScale: adjustments.redScale,
          greenScale: adjustments.greenScale,
          blueScale: adjustments.blueScale
        });
        
        // Split the image into BGR channels
        const bgr_channels = new window.cv.MatVector();
        window.cv.split(src, bgr_channels);
        
        // Get individual channels (OpenCV uses BGR order)
        const bChannel = bgr_channels.get(0);  // Blue channel
        const gChannel = bgr_channels.get(1);  // Green channel
        const rChannel = bgr_channels.get(2);  // Red channel
        
        // Apply scaling to each channel
        if (adjustments.blueScale !== 1.0) {
          bChannel.convertTo(bChannel, -1, adjustments.blueScale, 0);
        }
        
        if (adjustments.greenScale !== 1.0) {
          gChannel.convertTo(gChannel, -1, adjustments.greenScale, 0);
        }
        
        if (adjustments.redScale !== 1.0) {
          rChannel.convertTo(rChannel, -1, adjustments.redScale, 0);
        }
        
        // Merge channels back
        window.cv.merge(bgr_channels, src);
        
        // Clean up
        bgr_channels.delete();
        bChannel.delete();
        gChannel.delete();
        rChannel.delete();
        
      } catch (e) {
        console.error('OpenCV RGB adjustment failed:', e);
      }
    }
    
    // Apply brightness and contrast
    try {
      const alpha = (adjustments.contrast + 100) / 100;
      const beta = adjustments.brightness;
      window.cv.convertScaleAbs(src, src, alpha, beta);
    } catch (e) {
      console.warn('OpenCV brightness/contrast adjustment failed', e);
    }
    
    // Apply adaptive sharpening if enabled
    if (adjustments.sharpen > 0) {
      try {
        const blurred = new window.cv.Mat();
        const ksize = new window.cv.Size(5, 5);
        window.cv.GaussianBlur(src, blurred, ksize, 0);
        
        window.cv.addWeighted(src, 1 + adjustments.sharpen, blurred, -adjustments.sharpen, 0, src);
        
        blurred.delete();
      } catch (e) {
        console.warn('OpenCV sharpening failed', e);
      }
    }
    
    // Create result canvas
    const dstCanvas = document.createElement('canvas');
    window.cv.imshow(dstCanvas, src);
    src.delete();
    
    return dstCanvas;
  } catch (error) {
    console.error('Error in OpenCV processing', error);
    // Return the original canvas if OpenCV processing fails
    return canvas;
  }
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
  
  // Check if the data URL indicates this is a PNG with transparency
  const isPngWithTransparency = dataUrl.startsWith('data:image/png');
  
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
      link.download = `picme-${new Date().toISOString().slice(0, 10)}.zip`;
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
  return new Promise<void>((resolve, reject) => {
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
          let mimeType: string;
          
          switch (format) {
            case 'webp':
              finalDataUrl = canvas.toDataURL('image/webp', 0.9);
              extension = 'webp';
              mimeType = 'image/webp';
              break;
            case 'png':
              finalDataUrl = canvas.toDataURL('image/png');
              extension = 'png';
              mimeType = 'image/png';
              break;
            case 'jpg':
            default:
              finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              extension = 'jpg';
              mimeType = 'image/jpeg';
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