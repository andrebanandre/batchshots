import { AutoProcessor, AutoModelForImageTextToText, load_image, TextStreamer, env } from '@huggingface/transformers';

let processor = null;
let model = null;
let isWebGPU = false;

async function checkWebGPU() {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        self.postMessage({ status: 'webgpu_available' });
        return true;
      }
    } catch { /* ignore */ }
  }
  self.postMessage({ status: 'webgpu_unavailable' });
  return false;
}

async function ensureModelLoaded() {
  if (processor && model) return;
  isWebGPU = await checkWebGPU();

  // Optimize runtime backend
  env.backends.onnx.wasm.numThreads = 1;

  const model_id = 'onnx-community/FastVLM-0.5B-ONNX';
  self.postMessage({ status: 'loading_model', data: `Loading ${model_id}...` });
  try {
    processor = await AutoProcessor.from_pretrained(model_id);
    // Use fp16 for embed_tokens (small enough), q4 for vision and decoder
    // int8/uint8 variants use ConvInteger ops not supported in browser ONNX runtime
    model = await AutoModelForImageTextToText.from_pretrained(model_id, {
      dtype: {
        embed_tokens: 'fp16',  // 272 MB - small enough and compatible
        vision_encoder: 'q4',   // 505 MB - q4 works in browser, int8 doesn't
        decoder_model_merged: 'q4',
      },
      device: isWebGPU ? 'webgpu' : 'wasm',
    });
    self.postMessage({ status: 'ready', data: 'Model loaded' });
  } catch (error) {
    self.postMessage({ status: 'error', data: `Failed to load model: ${error.message}` });
    throw error;
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


