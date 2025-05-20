import { RawImage } from '@huggingface/transformers';

let modelPipeline = null;
let processor = null;
const modelName = 'Xenova/modnet';

// Initialize the model and processor
async function initializeModel(progress_callback = null) {
  if (!modelPipeline) {
    self.postMessage({ status: 'loading_model', data: `Loading ${modelName} model...` });
    
    try {
      // Load the model with AutoModel
      const { AutoModel, AutoProcessor } = await import('@huggingface/transformers');
      
      modelPipeline = await AutoModel.from_pretrained(modelName, { 
        progress_callback,
        dtype: "fp32" 
      });
      
      processor = await AutoProcessor.from_pretrained(modelName, {
        progress_callback
      });
      
      self.postMessage({ status: 'model_loaded', data: 'Background removal model loaded successfully.' });
    } catch (error) {
      console.error('Worker: Model loading error', error);
      self.postMessage({ status: 'error', data: `Failed to load model: ${error.message}` });
      throw error;
    }
  }
  return { modelPipeline, processor };
}

// Process image to remove background
async function removeBackground(blobData) {
  try {
    const image = await RawImage.fromBlob(blobData);
    
    // Pre-process image
    const { pixel_values } = await processor(image);
    
    // Generate alpha matte
    const { output } = await modelPipeline({ input: pixel_values });
    
    // Create mask from the model output
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);
    
    // Apply the mask to create a transparent background
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw original image
    const imageCanvas = await image.toCanvas();
    ctx.drawImage(imageCanvas, 0, 0);
    
    // Get mask data
    const maskCanvas = await mask.toCanvas();
    const maskCtx = maskCanvas.getContext('2d');
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Apply mask to the alpha channel
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Use mask value for alpha channel (index 3)
      imageData.data[i + 3] = maskData.data[i]; // Alpha value from mask
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to blob
    const processedBlob = await canvas.convertToBlob({ type: 'image/png' });
    
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
          self.postMessage({ status: 'loading_progress', data: progress });
        });
        self.postMessage({ status: 'ready', data: 'Background removal worker ready.' });
      } catch (error) {
        console.error('Worker initialization error:', error);
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
        // Make sure model is loaded
        await initializeModel();
        
        // Process the image
        const processedBlob = await removeBackground(imageData);
        
        // Convert the blob to base64 data URL for transfer
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