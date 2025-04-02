// Language: typescript
// Path: react-next\utils\predict.ts
import { prepareImageForUpscaling, tensorToImageData } from './imageHelper';
import { runUpscaleModel, ensureModelsLoaded } from './modelHelper';

// Preload models on import
if (typeof window !== 'undefined') {
  ensureModelsLoaded().catch(err => console.warn('Failed to preload model:', err));
}

export async function inferenceUpscale(imageElement: HTMLImageElement): Promise<[ImageData, number]> {
  try {
    // 1. Convert image to tensor for upscaling
    const [imageTensor, originalImg] = await prepareImageForUpscaling(imageElement);
    
    // 2. Run upscaling model
    const [outputTensor, inferenceTime] = await runUpscaleModel(imageTensor);
    
    // 3. Convert output tensor back to image data (preserve colors from original)
    const outputImageData = tensorToImageData(
      outputTensor, 
      outputTensor.dims[3], // width 
      outputTensor.dims[2], // height
      originalImg
    );
    
    // 4. Return image data and inference time
    return [outputImageData, inferenceTime];
  } catch (error) {
    console.error('Error during upscaling:', error);
    throw error;
  }
}

