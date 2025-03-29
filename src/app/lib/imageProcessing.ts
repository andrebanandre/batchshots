import { v4 as uuidv4 } from 'uuid';
import { ImageAdjustments } from '../components/ImageProcessingControls';
import { Preset } from '../components/PresetsSelector';
import { ImageFile } from '../components/ImagePreview';

// Import the OpenCV type from our declaration file
declare global {
  interface Window {
    cv: any; // Using any since OpenCV typings are inconsistent
  }
}

export const initOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
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

// Check if a specific OpenCV function is available
const hasOpenCVFunction = (functionName: string): boolean => {
  if (!window.cv) return false;
  
  const parts = functionName.split('.');
  let obj = window.cv;
  
  for (const part of parts) {
    if (!obj || typeof obj[part] === 'undefined') {
      return false;
    }
    obj = obj[part];
  }
  
  return typeof obj === 'function';
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
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const hFactor = (hue - 100) / 100;      // -1 to 1 range
  const sFactor = saturation / 100;       // 0 to 2 range
  const lFactor = lightness / 100;        // 0 to 2 range
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert RGB to HSL
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      
      h /= 6;
    }
    
    // Apply adjustments
    h = (h + hFactor) % 1;
    if (h < 0) h += 1;
    s = Math.max(0, Math.min(1, s * sFactor));
    l = Math.max(0, Math.min(1, l * lFactor));
    
    // Convert back to RGB
    let r1, g1, b1;
    
    if (s === 0) {
      r1 = g1 = b1 = l; // achromatic
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
            const processedCanvas = processWithOpenCV(canvas, adjustments);
            const dataUrl = processedCanvas.toDataURL('image/jpeg', preset ? preset.quality / 100 : 0.85);
            resolve(dataUrl);
            return;
          } catch (error) {
            console.warn('OpenCV processing failed, falling back to Canvas API', error);
            // Continue with canvas-based processing
          }
        }
        
        // Process with Canvas API
        console.log('Using Canvas API for image processing');
        
        // Apply auto-level if enabled
        if (adjustments.autoLevel) {
          canvasAutoLevel(ctx, width, height);
        }
        
        // Apply auto-gamma if enabled
        if (adjustments.autoGamma) {
          canvasGammaCorrection(ctx, width, height, 1.1); // Default gamma value
        }
        
        // Apply brightness and contrast
        canvasBrightnessContrast(ctx, width, height, adjustments.brightness, adjustments.contrast);
        
        // Apply HSL adjustments (similar to modulate in ImageMagick)
        canvasHSLAdjustment(ctx, width, height, adjustments.hue, adjustments.saturation, adjustments.lightness);
        
        // Apply RGB adjustments for white balance
        canvasRGBAdjustment(ctx, width, height, adjustments.redScale, adjustments.greenScale, adjustments.blueScale);
        
        // Apply sharpening if enabled
        if (adjustments.sharpen > 0) {
          canvasSharpen(ctx, width, height, adjustments.sharpen);
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

// OpenCV-based processing - this will only be called if OpenCV is available
function processWithOpenCV(canvas: HTMLCanvasElement, adjustments: ImageAdjustments): HTMLCanvasElement {
  try {
    // Create an OpenCV matrix from the canvas
    const mat = window.cv.imread(canvas);
    
    // Try to apply auto-level if enabled and function exists
    if (adjustments.autoLevel && hasOpenCVFunction('equalizeHist')) {
      try {
        // For color images, convert to YCrCb and equalize Y channel
        if (mat.channels() === 3 && hasOpenCVFunction('cvtColor')) {
          const ycrcbMat = new window.cv.Mat();
          window.cv.cvtColor(mat, ycrcbMat, window.cv.COLOR_BGR2YCrCb);
          
          const channels = new window.cv.MatVector();
          window.cv.split(ycrcbMat, channels);
          
          window.cv.equalizeHist(channels.get(0), channels.get(0));
          
          window.cv.merge(channels, ycrcbMat);
          window.cv.cvtColor(ycrcbMat, mat, window.cv.COLOR_YCrCb2BGR);
          
          ycrcbMat.delete();
          channels.delete();
        } else if (mat.channels() === 1) {
          // Grayscale image
          window.cv.equalizeHist(mat, mat);
        }
      } catch (e) {
        console.warn('OpenCV auto-level failed', e);
      }
    }
    
    // Apply brightness and contrast
    try {
      const alpha = (adjustments.contrast + 100) / 100;
      const beta = adjustments.brightness;
      window.cv.convertScaleAbs(mat, mat, alpha, beta);
    } catch (e) {
      console.warn('OpenCV brightness/contrast adjustment failed', e);
    }
    
    // Apply adaptive sharpening if enabled
    if (adjustments.sharpen > 0 && hasOpenCVFunction('GaussianBlur')) {
      try {
        const blurred = new window.cv.Mat();
        const ksize = new window.cv.Size(5, 5);
        window.cv.GaussianBlur(mat, blurred, ksize, 0);
        
        window.cv.addWeighted(mat, 1 + adjustments.sharpen, blurred, -adjustments.sharpen, 0, mat);
        
        blurred.delete();
      } catch (e) {
        console.warn('OpenCV sharpening failed', e);
      }
    }
    
    // Create result canvas
    const dstCanvas = document.createElement('canvas');
    window.cv.imshow(dstCanvas, mat);
    mat.delete();
    
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