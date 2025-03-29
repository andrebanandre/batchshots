import { v4 as uuidv4 } from 'uuid';
import { ImageAdjustments } from '../components/ImageProcessingControls';
import { Preset } from '../components/PresetsSelector';
import { ImageFile } from '../components/ImagePreview';

// Import the OpenCV type from our declaration file
declare global {
  interface Window {
    cv: typeof cv;
  }
}

export const initOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if OpenCV is already loaded
    if (window.cv && typeof window.cv.imread === 'function') {
      resolve();
      return;
    }

    // Set up an event listener for when OpenCV is ready
    const onOpenCvReady = () => {
      window.removeEventListener('opencv-ready', onOpenCvReady);
      resolve();
    };
    
    // Listen for the opencv-ready event from our loader script
    window.addEventListener('opencv-ready', onOpenCvReady);
    
    // If OpenCV is not available after 10 seconds, reject with a timeout error
    const timeoutId = setTimeout(() => {
      window.removeEventListener('opencv-ready', onOpenCvReady);
      reject(new Error('Timed out waiting for OpenCV.js to load'));
    }, 10000);
    
    // Clear the timeout if OpenCV loads successfully
    window.addEventListener('opencv-ready', () => clearTimeout(timeoutId), { once: true });
  });
};

export const processImage = async (
  imageFile: ImageFile, 
  adjustments: ImageAdjustments,
  preset: Preset | null
): Promise<string> => {
  if (!window.cv) {
    throw new Error('OpenCV.js is not loaded');
  }

  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        // Use OpenCV to process the image
        const mat = window.cv.imread(img);
        
        // Apply brightness and contrast
        const alpha = (adjustments.contrast + 100) / 100;
        const beta = adjustments.brightness;
        window.cv.convertScaleAbs(mat, mat, alpha, beta);
        
        // Apply white balance adjustment by scaling color channels
        const channels = new window.cv.MatVector();
        window.cv.split(mat, channels);
        
        const rChannel = channels.get(2); // OpenCV uses BGR ordering
        const gChannel = channels.get(1);
        const bChannel = channels.get(0);
        
        window.cv.convertScaleAbs(rChannel, rChannel, adjustments.redScale, 0);
        window.cv.convertScaleAbs(gChannel, gChannel, adjustments.greenScale, 0);
        window.cv.convertScaleAbs(bChannel, bChannel, adjustments.blueScale, 0);
        
        const mergedChannels = new window.cv.MatVector();
        mergedChannels.push_back(bChannel);
        mergedChannels.push_back(gChannel);
        mergedChannels.push_back(rChannel);
        
        window.cv.merge(mergedChannels, mat);
        
        // Resize if preset is provided
        if (preset) {
          const newWidth = preset.width;
          let newHeight = preset.height || 0;
          
          // Calculate height to maintain aspect ratio if height is null
          if (!preset.height) {
            const aspectRatio = mat.rows / mat.cols;
            newHeight = Math.round(newWidth * aspectRatio);
          }
          
          const dsize = new window.cv.Size(newWidth, newHeight);
          window.cv.resize(mat, mat, dsize, 0, 0, window.cv.INTER_AREA);
        }
        
        // Convert to canvas and then to data URL
        const canvas = document.createElement('canvas');
        window.cv.imshow(canvas, mat);
        
        // Set quality for the processed image
        const quality = preset ? preset.quality / 100 : 0.85;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Clean up OpenCV resources
        mat.delete();
        channels.delete();
        mergedChannels.delete();
        rChannel.delete();
        gChannel.delete();
        bChannel.delete();
        
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