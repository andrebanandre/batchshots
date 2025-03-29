import { v4 as uuidv4 } from 'uuid';
import { ImageAdjustments, defaultAdjustments } from '../components/ImageProcessingControls';
import { Preset } from '../components/PresetsSelector';
import { ImageFile } from '../components/ImagePreview';

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

// Canvas-based image processing fallbacks

// Canvas-based auto level (histogram equalization approximation)
function canvasAutoLevel(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Find min and max values for each channel
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    rMin = Math.min(rMin, r);
    rMax = Math.max(rMax, r);
    gMin = Math.min(gMin, g);
    gMax = Math.max(gMax, g);
    bMin = Math.min(bMin, b);
    bMax = Math.max(bMax, b);
  }
  
  // Apply normalization to stretch the histogram
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rMin === rMax ? 
      data[i] : 
      Math.round(((data[i] - rMin) / (rMax - rMin)) * 255);
      
    data[i + 1] = gMin === gMax ? 
      data[i + 1] : 
      Math.round(((data[i + 1] - gMin) / (gMax - gMin)) * 255);
      
    data[i + 2] = bMin === bMax ? 
      data[i + 2] : 
      Math.round(((data[i + 2] - bMin) / (bMax - bMin)) * 255);
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Canvas-based gamma correction
function canvasGammaCorrection(ctx: CanvasRenderingContext2D, width: number, height: number, gamma: number = 1.0): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Create gamma lookup table
  const gammaLookup = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaLookup[i] = Math.min(255, Math.round(Math.pow(i / 255, 1 / gamma) * 255));
  }
  
  // Apply gamma correction
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gammaLookup[data[i]];        // R
    data[i + 1] = gammaLookup[data[i + 1]]; // G
    data[i + 2] = gammaLookup[data[i + 2]]; // B
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Canvas-based sharpening with convolution
function canvasSharpen(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number): void {
  if (amount <= 0) return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const tempData = new Uint8ClampedArray(data);
  
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
  
  ctx.putImageData(imageData, 0, 0);
}

// Canvas-based HSL adjustment
function canvasHSLAdjustment(ctx: CanvasRenderingContext2D, width: number, height: number, 
                             hue: number, saturation: number, lightness: number): void {
  // Skip if no adjustments needed
  if (hue === 100 && saturation === 100 && lightness === 100) {
    return;
  }

  console.log('🔄 Canvas HSL Adjustment Applied:', { hue, saturation, lightness });
  
  // Ensure values are valid
  if (isNaN(hue)) hue = 100;
  if (isNaN(saturation)) saturation = 100;
  if (isNaN(lightness)) lightness = 100;

  // Calculate adjustment factors (from 100-based values)
  const hueShift = (hue - 100) * 3.6;       // Convert to degrees (-360 to +360)
  const satFactor = saturation / 100;        // 0-2 range
  const lightFactor = lightness / 100;       // 0-2 range

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
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
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Helper function for HSL to RGB conversion
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

// Apply brightness and contrast adjustment using Canvas
function canvasBrightnessContrast(ctx: CanvasRenderingContext2D, width: number, height: number, 
                                  brightness: number, contrast: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
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
  
  ctx.putImageData(imageData, 0, 0);
}

// Adjust RGB channel scales using Canvas
function canvasRGBAdjustment(ctx: CanvasRenderingContext2D, width: number, height: number,
                           redScale: number, greenScale: number, blueScale: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] * redScale));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * greenScale));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * blueScale));
  }
  
  ctx.putImageData(imageData, 0, 0);
}

export const processImage = async (
  imageFile: ImageFile, 
  adjustments: ImageAdjustments,
  preset: Preset | null
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Validate and sanitize adjustments to prevent NaN values
      const safeAdjustments = {
        ...defaultAdjustments,
        ...adjustments,
        // Ensure numeric values are valid
        brightness: isNaN(adjustments.brightness) ? 0 : adjustments.brightness,
        contrast: isNaN(adjustments.contrast) ? 0 : adjustments.contrast,
        redScale: isNaN(adjustments.redScale) ? 1.0 : adjustments.redScale,
        greenScale: isNaN(adjustments.greenScale) ? 1.0 : adjustments.greenScale,
        blueScale: isNaN(adjustments.blueScale) ? 1.0 : adjustments.blueScale,
        sharpen: isNaN(adjustments.sharpen) ? 0 : adjustments.sharpen,
        saturation: isNaN(adjustments.saturation) ? 100 : adjustments.saturation,
        hue: isNaN(adjustments.hue) ? 100 : adjustments.hue,
        lightness: isNaN(adjustments.lightness) ? 100 : adjustments.lightness
      };
      
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Apply preset dimensions if provided
        if (preset) {
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
        const ctx = canvas.getContext('2d')!;
        
        // Draw the original image (resizing if needed)
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try to use OpenCV if available, otherwise fall back to canvas methods
        if (window.cv && typeof window.cv.imread === 'function') {
          try {
            console.log('Using OpenCV for image processing');
            const processedCanvas = processWithOpenCV(canvas, safeAdjustments);
            const dataUrl = processedCanvas.toDataURL('image/jpeg', preset ? preset.quality / 100 : 0.85);
            resolve(dataUrl);
            return;
          } catch (error) {
            console.warn('OpenCV processing failed, falling back to Canvas API', error);
            // Continue with canvas-based processing
          }
        }
        
        // Process with Canvas API
        console.log('Using Canvas API for image processing with adjustments:', safeAdjustments);
        
        // Apply auto-level if enabled
        if (safeAdjustments.autoLevel) {
          canvasAutoLevel(ctx, width, height);
        }
        
        // Apply auto-gamma if enabled
        if (safeAdjustments.autoGamma) {
          canvasGammaCorrection(ctx, width, height, 1.1); // Default gamma value
        }
        
        // Apply brightness and contrast
        canvasBrightnessContrast(ctx, width, height, safeAdjustments.brightness, safeAdjustments.contrast);
        
        // Apply HSL adjustments (similar to modulate in ImageMagick)
        canvasHSLAdjustment(ctx, width, height, safeAdjustments.hue, safeAdjustments.saturation, safeAdjustments.lightness);
        
        // Apply RGB adjustments for white balance
        canvasRGBAdjustment(ctx, width, height, safeAdjustments.redScale, safeAdjustments.greenScale, safeAdjustments.blueScale);
        
        // Apply sharpening if enabled
        if (safeAdjustments.sharpen > 0) {
          canvasSharpen(ctx, width, height, safeAdjustments.sharpen);
        }
        
        // Convert to data URL with quality setting
        const quality = preset ? preset.quality / 100 : 0.85;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Error loading image'));
      };
      
      img.src = imageFile.dataUrl;
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
          const hueShiftMat = new window.cv.Mat(hChannel.rows, hChannel.cols, hChannel.type(), 
            new window.cv.Scalar(hueOffset));
          window.cv.add(hChannel, hueShiftMat, hChannel);
          
          // Ensure hue values stay within 0-180 range
          const upperBound = new window.cv.Mat(hChannel.rows, hChannel.cols, hChannel.type(), 
            new window.cv.Scalar(180));
          const lowerBound = new window.cv.Mat(hChannel.rows, hChannel.cols, hChannel.type(), 
            new window.cv.Scalar(0));
          
          window.cv.min(hChannel, upperBound, hChannel);
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
    
    // Try to apply auto-level if enabled
    if (adjustments.autoLevel) {
      try {
        // For color images, convert to YCrCb and equalize Y channel
        if (src.channels() === 3) {
          const ycrcbMat = new window.cv.Mat();
          window.cv.cvtColor(src, ycrcbMat, window.cv.COLOR_BGR2YCrCb);
          
          const channels = new window.cv.MatVector();
          window.cv.split(ycrcbMat, channels);
          
          window.cv.equalizeHist(channels.get(0), channels.get(0));
          
          window.cv.merge(channels, ycrcbMat);
          window.cv.cvtColor(ycrcbMat, src, window.cv.COLOR_YCrCb2BGR);
          
          ycrcbMat.delete();
          channels.delete();
        } else if (src.channels() === 1) {
          // Grayscale image
          window.cv.equalizeHist(src, src);
        }
      } catch (e) {
        console.warn('OpenCV auto-level failed', e);
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

export const createImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      resolve({
        id: uuidv4(),
        file,
        dataUrl,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const downloadImage = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadAllImages = (images: ImageFile[]): void => {
  images.forEach((image) => {
    if (image.processedDataUrl) {
      downloadImage(image.processedDataUrl, `processed_${image.file.name}`);
    }
  });
}; 