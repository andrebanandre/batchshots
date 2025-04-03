import { removeBackground } from "@imgly/background-removal";
import { ImageFile } from "../components/ImagePreview";

/**
 * Utility for managing background removal operations
 */

// Quality settings for background removal output
const BACKGROUND_REMOVAL_CONFIG = {
  format: 'image/png' as const,
  quality: 1, // Maximum quality for transparency
};

// Size for thumbnail generation
const MAX_THUMB_SIZE = 500;

/**
 * Remove background from an image
 * @param imageData Original image data URL or blob
 * @returns Processed image blob with background removed
 */
export async function removeImageBackground(imageData: string | Blob): Promise<Blob> {
  const blob = typeof imageData === 'string' 
    ? await fetch(imageData).then(res => res.blob())
    : imageData;
  
  // Process with high quality settings
  return await removeBackground(blob, {
    output: BACKGROUND_REMOVAL_CONFIG
  });
}

/**
 * Create a thumbnail with a transparent background
 * @param imageData Original image data
 * @param maxSize Maximum thumbnail size
 * @returns Data URL of the generated thumbnail
 */
export async function createTransparentThumbnail(imageData: string, maxSize = MAX_THUMB_SIZE): Promise<string> {
  // Create image element to get dimensions
  const img = new Image();
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = imageData;
  });
  
  // Calculate thumbnail dimensions
  let width = img.width;
  let height = img.height;
  
  if (width > height) {
    if (width > maxSize) {
      height = Math.floor(height * (maxSize / width));
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = Math.floor(width * (maxSize / height));
      height = maxSize;
    }
  }
  
  // Create canvas for thumbnail
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Use high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Create transparent background
    ctx.clearRect(0, 0, width, height);
    
    // Draw the image on top with high quality rendering
    ctx.drawImage(img, 0, 0, width, height);
  }
  
  // Return high quality PNG thumbnail with transparency
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Process a single image to remove background
 * @param image Original image file object
 * @returns Object with processed image data
 */
export async function processImageBackground(image: ImageFile): Promise<{
  dataUrl: string;
  thumbnailUrl: string;
  file: File;
}> {
  // Remove background from original image
  const resultBlob = await removeImageBackground(image.dataUrl);
  
  // Convert result to data URL
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(resultBlob);
  });
  
  // Create new file with PNG extension
  const newFile = new File(
    [resultBlob], 
    image.file.name.replace(/\.[^/.]+$/, '.png'), 
    { type: 'image/png' }
  );
  
  // Create thumbnail
  const thumbnailUrl = await createTransparentThumbnail(dataUrl);
  
  return {
    dataUrl,
    thumbnailUrl,
    file: newFile
  };
}

/**
 * Update image state with background removed data
 * @param image Original image
 * @param processedData Processed background removal data
 * @returns Updated image object with background removed
 */
export function getUpdatedImageWithBackground(
  image: ImageFile, 
  processedData: {dataUrl: string; thumbnailUrl: string; file: File}
): ImageFile {
  return {
    ...image,
    dataUrl: processedData.dataUrl,
    thumbnailDataUrl: processedData.thumbnailUrl,
    file: processedData.file,
    // Also set as processed versions to ensure they're used in UI and downloads
    processedDataUrl: processedData.dataUrl,
    processedThumbnailUrl: processedData.thumbnailUrl,
    backgroundRemoved: true
  };
} 