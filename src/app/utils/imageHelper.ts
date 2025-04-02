import { Tensor } from 'onnxruntime-web';

// Prepare image tensor for upscaling model
export async function prepareImageForUpscaling(imgElement: HTMLImageElement): Promise<[Tensor, HTMLImageElement]> {
  if (!window.cv) {
    throw new Error('OpenCV is not loaded');
  }
  
  const cv = window.cv;
  console.log(`Original image dimensions: ${imgElement.width}x${imgElement.height}`);
  
  try {
    // Read image using OpenCV
    const mat = cv.imread(imgElement);
    
    // Resize to 224x224 (input size for the model)
    const resizedMat = new cv.Mat();
    const size = new cv.Size(224, 224);
    cv.resize(mat, resizedMat, size, 0, 0, cv.INTER_AREA);
    
    // Normalize pixel values to 0-1 range
    const normalizedMat = new cv.Mat();
    resizedMat.convertTo(normalizedMat, cv.CV_32F, 1.0 / 255.0);
    
    // Get data from OpenCV Mat
    const tensor_data = new Float32Array(224 * 224);
    for (let i = 0; i < 224; i++) {
      for (let j = 0; j < 224; j++) {
        // For grayscale, we just need one channel
        const pixel = normalizedMat.floatPtr(i, j);
        tensor_data[i * 224 + j] = pixel[0]; // Use first channel
      }
    }
    
    // Create tensor in NCHW format (batch, channels, height, width)
    // For grayscale, we use a single channel
    const tensor = new Tensor('float32', tensor_data, [1, 1, 224, 224]);
    console.log('Created input tensor with shape:', tensor.dims);
    
    // Clean up OpenCV resources
    mat.delete();
    resizedMat.delete();
    normalizedMat.delete();
    
    // Return both the tensor and the original image
    return [tensor, imgElement];
  } catch (error) {
    console.error('Error preparing image:', error);
    throw error;
  }
}

// Convert output tensor from upscaling model back to image
export function tensorToImageData(
  tensor: Tensor,
  width: number,
  height: number,
  originalImg: HTMLImageElement
): ImageData {
  const dimensions = tensor.dims;
  console.log(`Tensor dimensions: ${dimensions}`);
  const data = tensor.data as Float32Array;
  console.log(`Tensor data type: ${data.constructor.name}, length: ${data.length}`);
  
  // Calculate min and max without using spread operator (to avoid stack overflow)
  let min = Infinity;
  let max = -Infinity;
  
  // Only iterate over the first million elements to avoid excessive computation
  const maxElementsToCheck = Math.min(1000000, data.length);
  for (let i = 0; i < maxElementsToCheck; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  console.log(`Tensor min/max calculated: ${min}, ${max} (from first ${maxElementsToCheck} elements)`);
  
  // Create the image data array
  const imageData = new Uint8ClampedArray(width * height * 4);
  
  // Apply contrast enhancement for better visibility
  let minValue = Number.MAX_VALUE;
  let maxValue = Number.MIN_VALUE;
  
  // Find min and max values for contrast stretching
  for (let i = 0; i < height * width; i++) {
    const pixelValue = data[i];
    minValue = Math.min(minValue, pixelValue);
    maxValue = Math.max(maxValue, pixelValue);
  }
  
  console.log(`Tensor min/max after calculation: ${minValue}, ${maxValue}`);
  
  // Process grayscale directly to final imageData instead of creating another array
  const range = maxValue - minValue;
  for (let i = 0; i < height * width; i++) {
    const normalizedValue = range > 0 ? (data[i] - minValue) / range : data[i];
    // Use a moderate gamma correction
    const gammaValue = Math.pow(normalizedValue, 0.7);
    const value = Math.min(255, Math.max(0, Math.round(gammaValue * 255)));
    
    const offset = i * 4;
    // Set default grayscale values - will be overwritten if color preservation succeeds
    imageData[offset] = value;     // R
    imageData[offset + 1] = value; // G
    imageData[offset + 2] = value; // B
    imageData[offset + 3] = 255;   // Alpha
  }
  
  console.log('Basic grayscale rendering applied');
  
  // Apply color preservation if OpenCV is available
  if (window.cv && originalImg.complete) {
    try {
      // Create a canvas to draw the original image for color extraction
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Resize original image to match the upscaled dimensions
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // Draw the original image scaled to match upscaled dimensions
        tempCtx.drawImage(originalImg, 0, 0, width, height);
        
        // Get the original image data (for color information)
        const origImgData = tempCtx.getImageData(0, 0, width, height);
        const origData = origImgData.data;
        
        console.log('Original image data extracted for color preservation');
        
        // Apply YUV-like color preservation (keep color from original, use luminance from upscaled)
        for (let i = 0; i < height * width; i++) {
          // Get the normalized luminance (Y) from the upscaled image
          const normalizedValue = range > 0 ? (data[i] - minValue) / range : data[i];
          const gamma = Math.pow(normalizedValue, 0.7); // Gamma adjustment
          const luminance = Math.min(255, Math.max(0, Math.round(gamma * 255)));
          
          // Get original RGB values for this pixel
          const origOffset = i * 4;
          const origR = origData[origOffset];
          const origG = origData[origOffset + 1];
          const origB = origData[origOffset + 2];
          
          // Calculate original luminance
          const origLuminance = 0.299 * origR + 0.587 * origG + 0.114 * origB;
          
          // Apply luminance ratio to preserve colors (with safety check)
          if (origLuminance > 5) { // Only apply to non-black pixels
            const ratio = luminance / origLuminance;
            const limitedRatio = Math.min(2.0, Math.max(0.2, ratio));
            
            const offset = i * 4;
            imageData[offset] = Math.min(255, Math.max(0, Math.round(origR * limitedRatio)));
            imageData[offset + 1] = Math.min(255, Math.max(0, Math.round(origG * limitedRatio)));
            imageData[offset + 2] = Math.min(255, Math.max(0, Math.round(origB * limitedRatio)));
          }
          // Alpha channel already set to 255
        }
        console.log('Color preservation applied successfully');
      } else {
        console.error('Failed to get canvas context for color preservation');
      }
    } catch (e) {
      console.error('Error during color preservation:', e);
    }
  } else {
    console.warn('OpenCV not available or original image not loaded, using grayscale');
  }
  
  // Final visual check
  console.log('Final image data ready, returning ImageData');
  return new ImageData(imageData, width, height);
}


