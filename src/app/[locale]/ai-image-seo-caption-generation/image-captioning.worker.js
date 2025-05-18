import { pipeline } from '@huggingface/transformers';
import slug from 'slug'; // Import slug

let captionPipelineInstance = null;
// Using the quantized model by default, Transformers.js will pick the quantized ONNX files.
const modelName = 'Xenova/vit-gpt2-image-captioning';
const quantized = true; // Explicitly try to use quantized, though often Transformers.js handles this well.

async function getCaptionPipeline(progress_callback = null) {
    if (!captionPipelineInstance) {
        self.postMessage({ status: 'loading_model', data: `Loading caption model ${modelName} (quantized: ${quantized})...` });
        try {
            captionPipelineInstance = await pipeline('image-to-text', modelName, {
                quantized: quantized,
                progress_callback,
            });
            self.postMessage({ status: 'model_loaded', data: 'Caption model loaded successfully.' });
        } catch (error) {
            console.error('Worker: Caption model loading error', error);
            self.postMessage({ status: 'error', data: `Failed to load caption model: ${error.message}` });
            throw error;
        }
    }
    return captionPipelineInstance;
}

self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'load':
            self.postMessage({ status: 'initializing', data: 'Caption worker initializing and loading model...' });
            try {
                await getCaptionPipeline((progress) => {
                    self.postMessage({ status: 'loading_progress', data: progress });
                });
                self.postMessage({ status: 'ready', data: 'Caption worker ready.' });
            } catch (initializationError) {
                console.error('Worker: Caption worker initialization/load error', initializationError);
                // Error message already posted by getCaptionPipeline
            }
            break;

        case 'generateCaption': {
            const { imageUrl, imageId } = data;
            if (!imageUrl) {
                self.postMessage({ status: 'error', imageId, data: 'No image URL provided to caption worker.' });
                return;
            }

            self.postMessage({ status: 'processing', imageId, data: `Generating description for image ID: ${imageId}` });
            try {
                const generator = await getCaptionPipeline(); // Ensures pipeline is loaded
                const output = await generator(imageUrl);
                
                let description = 'No description generated.';
                if (output && output.length > 0 && output[0].generated_text) {
                    description = output[0].generated_text;
                } else {
                    console.warn(`Worker: No valid description generated for image ID ${imageId}. Output:`, output);
                    throw new Error('Worker: Failed to generate a valid description.');
                }
                
                const seoName = slug(description, { lower: true }).substring(0, 70); // Use slug, ensure lowercasing, and then substring

                self.postMessage({
                    status: 'generation_complete',
                    imageId,
                    description: description,
                    seoName: seoName,
                });
            } catch (error) {
                console.error(`Worker: Error generating description for image ID ${imageId}:`, error);
                self.postMessage({
                    status: 'error',
                    imageId,
                    data: `Error generating description: ${error.message || 'Unknown error'}`
                });
            }
            break;
        }
        default:
            console.warn(`Worker: Unknown message type received in caption worker: ${type}`);
            self.postMessage({ status: 'warn', data: `Unknown message type: ${type}` });
    }
});

self.postMessage({ status: 'worker_started', data: 'Image description worker started successfully.' }); 