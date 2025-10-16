import { AutoProcessor, AutoModelForImageTextToText, load_image, TextStreamer, env } from '@huggingface/transformers';
import { checkWebGPU, getOptimalWasmThreads, getDeviceResourceTier } from '../../utils/workerDeviceDetector.js';
import { getFastVLMConfig, estimateModelSize } from '../../utils/workerModelConfig.js';

let processor = null;
let model = null;
let isWebGPU = false;

// Detect iOS early for cache configuration
const IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

// Configure cache settings - iOS Safari doesn't support Cache API in workers
env.allowLocalModels = false;
env.allowRemoteModels = true;

if (IS_IOS) {
  // iOS: Disable Cache API entirely, use direct fetch
  env.useBrowserCache = false;
  env.useCustomCache = false;

  // Set custom cache location to avoid Cache API
  // Transformers.js will fall back to direct HTTP requests
  env.cacheDir = '.'; // Use current directory (no caching)
} else {
  // Desktop: Use normal browser cache
  env.useBrowserCache = true;
}

// Memory optimization: disable model caching in memory
env.backends.onnx.wasm.proxy = false;

async function ensureModelLoaded() {
  if (processor && model) return;

  // Detect device capabilities
  const deviceTier = await getDeviceResourceTier();
  const optimalThreads = getOptimalWasmThreads();

  // iOS-specific: Force WASM, WebGPU has issues on iOS
  if (IS_IOS) {
    isWebGPU = false; // Force disable WebGPU on iOS
  } else {
    isWebGPU = await checkWebGPU();
  }

  // Optimize runtime backend for mobile
  env.backends.onnx.wasm.numThreads = optimalThreads;

  // Additional mobile optimizations
  if (deviceTier === 'ultra-low') {
    // Use CDN for WASM binaries (don't bundle locally)
    env.backends.onnx.wasm.wasmPaths = undefined;

    self.postMessage({
      status: 'warn',
      data: 'Mobile device detected. Model loading may take several minutes and requires ~800MB of memory. Please ensure you have a stable connection and sufficient free memory.'
    });
  }

  const model_id = 'onnx-community/FastVLM-0.5B-ONNX';

  self.postMessage({
    status: 'device_detected',
    data: {
      tier: deviceTier,
      webgpu: isWebGPU,
      threads: optimalThreads,
    }
  });

  // Fallback chain: try progressively smaller configurations
  const fallbackTiers = deviceTier === 'ultra-low'
    ? ['ultra-low', 'low']
    : [deviceTier, 'low', 'ultra-low'];

  let lastError = null;

  for (const tier of fallbackTiers) {
    try {
      const { getFastVLMConfigForTier, estimateModelSize } = await import('../../utils/workerModelConfig.js');
      const modelConfig = getFastVLMConfigForTier(tier);
      const estimatedSize = estimateModelSize(modelConfig);

      self.postMessage({
        status: 'loading_model',
        data: `Loading ${model_id} (${tier} tier, ~${Math.round(estimatedSize)} MB)...`
      });

      // Load processor if not already loaded
      if (!processor) {
        processor = await AutoProcessor.from_pretrained(model_id);
      }

      // Try to load model with this configuration
      model = await AutoModelForImageTextToText.from_pretrained(model_id, {
        dtype: modelConfig,
        device: 'wasm', // Force WASM for mobile (WebGPU can cause issues)
      });

      self.postMessage({
        status: 'ready',
        data: `Model loaded successfully (${tier} tier, ~${Math.round(estimatedSize)} MB)`
      });

      return; // Success!

    } catch (error) {
      lastError = error;
      const isLastTier = tier === fallbackTiers[fallbackTiers.length - 1];

      self.postMessage({
        status: 'warn',
        data: `Failed to load ${tier} tier: ${error.message}${isLastTier ? '' : ', trying next tier...'}`
      });

      // If this was the last tier, throw the error
      if (isLastTier) {
        throw error;
      }

      // Clear partial state before retrying
      model = null;
    }
  }

  // Should never reach here, but just in case
  if (lastError) {
    const errorMsg = lastError.message.includes('out of memory') || lastError.message.includes('Out of memory')
      ? 'Insufficient memory to load the AI model on this device. The FastVLM model requires at least 800MB of free memory. Please try:\n' +
        '1. Close other browser tabs and apps\n' +
        '2. Restart your browser\n' +
        '3. Use a desktop computer for AI captioning\n' +
        'Note: AI captioning may not be supported on all mobile devices due to memory constraints.'
      : `Model loading failed: ${lastError.message}`;

    self.postMessage({
      status: 'error',
      data: errorMsg
    });
    throw lastError;
  }
}

async function captionBlob(imageBlob, promptText, requestId) {
  await ensureModelLoaded();

  const defaultPrompt = 'Describe this image in detail.';
  const messages = [
    { role: 'user', content: `<image>${promptText || defaultPrompt}` },
  ];
  const prompt = processor.apply_chat_template(messages, { add_generation_prompt: true });

  const image = await load_image(imageBlob);
  const inputs = await processor(image, prompt, { add_special_tokens: false });

  let generatedText = '';
  const streamer = new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: false,
    callback_function: (text) => {
      generatedText += text;
      self.postMessage({ status: 'stream', requestId, data: text });
    },
  });

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: 128,
    do_sample: false,
    streamer,
  });

  const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  const caption = decoded[0] || generatedText || '';
  return caption.trim();
}

self.addEventListener('message', async (e) => {
  const { type, data } = e.data || {};
  try {
    switch (type) {
      case 'load': {
        await ensureModelLoaded();
        break;
      }
      case 'caption': {
        const { imageId, imageData, prompt } = data;
        if (!imageData) {
          self.postMessage({ status: 'error', imageId, data: 'No image blob provided' });
          return;
        }
        self.postMessage({ status: 'processing', imageId });
        const caption = await captionBlob(imageData, prompt, imageId);
        self.postMessage({ status: 'complete', imageId, data: caption });
        break;
      }
      default:
        self.postMessage({ status: 'warn', data: `Unknown message type: ${type}` });
    }
  } catch (error) {
    self.postMessage({ status: 'error', data: error.message, imageId: data?.imageId });
  }
});


