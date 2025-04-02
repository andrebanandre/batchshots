import * as ort from 'onnxruntime-web';
import { Tensor } from 'onnxruntime-web';

// Ensure ONNX Runtime runs in the browser environment
if (typeof window !== 'undefined') {
  // The WASM files will be automatically found by onnxruntime-web
  // in the _next/static directory after build
  ort.env.wasm.numThreads = 3;
  
  // Set execution providers preference
  ort.env.wasm.simd = true;
  
  // Preload model if in browser environment
  if (typeof window.preloadModels === 'undefined') {
    window.preloadModels = () => {
      console.log('Preloading ONNX upscaler model...');
      // Start loading model immediately in the background
      getUpscalerSession().catch(e => console.warn('Failed to preload Upscaler:', e));
    };
    
    // Start preloading after a short delay
    setTimeout(() => {
      if (window.preloadModels) window.preloadModels();
    }, 2000);
  }
}

// Model path
const MODEL_UPSCALER_PATH = '/models/super-resolution-10.onnx';

// Initialize session cache
let upscalerSession: ort.InferenceSession | null = null;
let modelLoadPromise: Promise<void> | null = null;

// Initialize upscaler model inference session if not already initialized
async function getUpscalerSession(): Promise<ort.InferenceSession> {
  if (!upscalerSession) {
    try {
      const sessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all' as const,
      };
      
      console.log('Loading upscaler model...');
      upscalerSession = await ort.InferenceSession.create(MODEL_UPSCALER_PATH, sessionOptions);
      console.log('Upscaler model loaded successfully');
    } catch (e) {
      console.error(`Failed to create inference session for upscaler: ${e}`);
      throw e;
    }
  }
  return upscalerSession;
}

// Ensure model is loaded - can be called early to warm up
export async function ensureModelsLoaded(): Promise<void> {
  if (!modelLoadPromise) {
    modelLoadPromise = getUpscalerSession()
      .catch(e => console.warn('Failed to load Upscaler:', e))
      .then(() => {});
  }
  return modelLoadPromise;
}

// Run upscaler model
export async function runUpscaleModel(imageTensor: Tensor): Promise<[Tensor, number]> {
  // Get inference session
  const session = await getUpscalerSession();
  
  // Prepare feeds
  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = imageTensor;
  
  // Run inference and measure time
  const start = performance.now();
  const outputData = await session.run(feeds);
  const end = performance.now();
  const inferenceTime = end - start;
  
  // Get output tensor
  const outputTensor = outputData[session.outputNames[0]];
  
  return [outputTensor, inferenceTime];
}

