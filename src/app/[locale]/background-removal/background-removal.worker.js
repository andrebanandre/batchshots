import { RawImage, pipeline, env } from '@huggingface/transformers';

// Check for WebGPU availability
const checkWebGPU = async () => {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        self.postMessage({ status: 'webgpu_available', data: 'WebGPU is available' });
        return true;
      }
    } catch (error) {
      console.warn('WebGPU check failed:', error);
    }
  }
  self.postMessage({ status: 'webgpu_unavailable', data: 'WebGPU is not available, using WASM backend' });
  return false;
};

// Model configuration
let segmentator = null;
let modelName = 'briaai/RMBG-1.4';
let isWebGPU = false;

// Initialize the model using pipeline API
async function initializeModel(progress_callback = null) {
  if (!segmentator) {
    try {
      // Check WebGPU availability
      isWebGPU = await checkWebGPU();

      // Optimize WASM/WebGPU settings
      env.backends.onnx.wasm.numThreads = 1;

      self.postMessage({ status: 'loading_model', data: `Loading ${modelName} model...` });

      // Use pipeline API for image segmentation
      const config = {
        progress_callback,
        device: isWebGPU ? 'webgpu' : 'wasm',
      };

      // For WebGPU, use fp16 for better performance
      if (isWebGPU) {
        config.dtype = 'fp16';
      } else {
        config.dtype = 'fp32';
      }

      segmentator = await pipeline('image-segmentation', modelName, config);

      self.postMessage({
        status: 'model_loaded',
        data: `${modelName} loaded successfully with ${isWebGPU ? 'WebGPU' : 'WASM'} backend`
      });
    } catch (error) {
      console.error('Worker: Model loading error', error);
      self.postMessage({ status: 'error', data: `Failed to load model: ${error.message}` });
      throw error;
    }
  }
  return segmentator;
}

/**
 * Applies an alpha mask to RGBA pixel data to make background transparent
 * The mask represents the foreground (object to keep), so we invert it for background removal
 * @param {Uint8Array | Uint8ClampedArray} originalPixels - Original RGBA pixel data
 * @param {Uint8Array | Uint8ClampedArray} alphaMaskData - Alpha mask from segmentation
 * @returns {Uint8ClampedArray} New pixel data with updated alpha channel
 */
function applyAlphaMask(originalPixels, alphaMaskData) {
  const newPixelData = new Uint8ClampedArray(originalPixels);

  // Each pixel has 4 components (R, G, B, A)
  // alphaMaskData has one alpha value per pixel
  // The mask values indicate the foreground, so we use them directly as alpha
  for (let i = 0; i < alphaMaskData.length; ++i) {
    const alphaMaskValue = alphaMaskData[i];
    // Set the alpha channel (every 4th value starting from index 3)
    // Mask value 255 = foreground (keep), 0 = background (transparent)
    newPixelData[i * 4 + 3] = alphaMaskValue;
  }

  return newPixelData;
}

// Process image to remove background
async function removeBackground(blobData) {
  try {
    // Load image
    const sourceImage = await RawImage.fromBlob(blobData);

    self.postMessage({
      status: 'processing_started',
      data: `Processing image ${sourceImage.width}x${sourceImage.height}`
    });

    // Run segmentation with pipeline API
    // Returns array of segments, we want the first one (foreground object)
    const [foregroundSegment] = await segmentator(sourceImage, {
      threshold: 0.5,
      mask_threshold: 0.5,
      overlap_mask_area_threshold: 0.8,
    });

    // The mask is a RawImage, we need to get its dimensions and data
    const mask = foregroundSegment.mask;
    const maskWidth = mask.width;
    const maskHeight = mask.height;
    const maskData = mask.data;

    // Debug: log dimensions to verify
    console.log('Source image dimensions:', sourceImage.width, 'x', sourceImage.height);
    console.log('Mask dimensions:', maskWidth, 'x', maskHeight);
    console.log('Mask data length:', maskData.length);
    console.log('Mask channels:', mask.channels);

    // Calculate expected lengths
    const pixelCount = sourceImage.width * sourceImage.height;
    const expectedMaskLength = pixelCount * mask.channels; // Could be 1 (grayscale) or 3/4 (RGB/RGBA)
    console.log('Expected mask length:', expectedMaskLength, 'channels:', mask.channels);

    // The mask should match the source image dimensions
    if (maskWidth !== sourceImage.width || maskHeight !== sourceImage.height) {
      throw new Error(`Mask dimensions (${maskWidth}x${maskHeight}) don't match source image (${sourceImage.width}x${sourceImage.height})`);
    }

    // Create a canvas with the source image
    const canvas = new OffscreenCanvas(sourceImage.width, sourceImage.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    const sourceCanvas = await sourceImage.toCanvas();
    ctx.drawImage(sourceCanvas, 0, 0);

    // Get the image data
    const imageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);
    const pixels = imageData.data;

    // Extract grayscale alpha values from mask
    // If mask has multiple channels, use the first channel (red for RGB masks)
    let alphaMask;
    if (mask.channels === 1) {
      // Grayscale mask - use directly
      alphaMask = maskData;
    } else {
      // Multi-channel mask - extract first channel
      alphaMask = new Uint8ClampedArray(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        alphaMask[i] = maskData[i * mask.channels]; // Take first channel
      }
    }

    // Apply the mask to make background transparent
    const processedPixelData = applyAlphaMask(pixels, alphaMask);

    // Create ImageData for the result
    const outputImageData = new ImageData(
      processedPixelData,
      sourceImage.width,
      sourceImage.height
    );

    // Put the processed image data on the canvas
    ctx.putImageData(outputImageData, 0, 0);

    // Convert to blob
    const processedBlob = await canvas.convertToBlob({
      type: 'image/png',
      quality: 1.0
    });

    return processedBlob;
  } catch (error) {
    console.error('Background removal error:', error);
    throw error;
  }
}

// Message handler
self.addEventListener('message', async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case 'load':
      self.postMessage({ status: 'initializing', data: 'Background removal worker initializing...' });
      try {
        await initializeModel((progress) => {
          // Only send progress updates at key milestones to reduce message overhead
          if (progress.status === 'progress' && progress.progress % 20 === 0) {
            self.postMessage({ status: 'loading_progress', data: progress });
          } else if (progress.status !== 'progress') {
            self.postMessage({ status: 'loading_progress', data: progress });
          }
        });
        self.postMessage({ status: 'ready', data: 'Background removal worker ready.' });
      } catch (error) {
        console.error('Worker initialization error:', error);
        self.postMessage({ status: 'error', data: `Initialization failed: ${error.message}` });
      }
      break;

    case 'process': {
      const { imageId, imageData } = data;

      if (!imageData) {
        self.postMessage({ status: 'error', imageId, data: 'No image data provided.' });
        return;
      }

      self.postMessage({ status: 'processing', imageId, data: `Processing image ID: ${imageId}` });

      try {
        // Ensure model is loaded
        await initializeModel();

        // Process the image
        const processedBlob = await removeBackground(imageData);

        // Convert blob to base64 for transfer
        const reader = new FileReader();
        reader.onload = function() {
          const base64Data = reader.result;

          self.postMessage({
            status: 'complete',
            imageId,
            base64Data,
            blobType: processedBlob.type
          });
        };

        reader.onerror = function() {
          self.postMessage({
            status: 'error',
            imageId,
            data: 'Failed to convert processed image to base64'
          });
        };

        reader.readAsDataURL(processedBlob);
      } catch (error) {
        console.error(`Error processing image ID ${imageId}:`, error);
        self.postMessage({
          status: 'error',
          imageId,
          data: `Processing error: ${error.message || 'Unknown error'}`
        });
      }
      break;
    }

    default:
      console.warn(`Worker: Unknown message type received: ${type}`);
      self.postMessage({ status: 'warn', data: `Unknown message type: ${type}` });
  }
});

// Inform main thread that worker has started
self.postMessage({ status: 'worker_started', data: 'Background removal worker started successfully.' });
