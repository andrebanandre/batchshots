import { pipeline } from '@huggingface/transformers';


let pipelineInstance = null;
const modelName = 'Xenova/vit-base-patch16-224-in21k'; // Using the same model as in the page

async function getPipeline(progress_callback = null) {
    if (!pipelineInstance) {
        self.postMessage({ status: 'loading_model', data: `Loading model ${modelName}...` });
        try {
            pipelineInstance = await pipeline('image-feature-extraction', modelName, {
                progress_callback,
            });
            self.postMessage({ status: 'model_loaded', data: 'Model loaded successfully.' });
        } catch (error) {
            console.error('Worker: Model loading error', error);
            self.postMessage({ status: 'error', data: `Failed to load model: ${error.message}` });
            throw error; 
        }
    }
    return pipelineInstance;
}

self.addEventListener('message', async (e) => {
    const { type, data } = e.data;
    // console.log('Worker: Received message - Type:', type, 'Data:', data); // Keep for debugging if needed

    switch (type) {
        case 'load':
            self.postMessage({ status: 'initializing', data: 'Worker initializing and loading model...' });
            try {
                await getPipeline((progress) => {
                    // Forwarding progress like this can be very chatty. 
                    // Consider sending less frequent updates or specific milestones.
                    self.postMessage({ status: 'loading_progress', data: progress });
                });
                self.postMessage({ status: 'ready', data: 'Worker ready.' });
            } catch (initializationError) { // Changed variable name to avoid conflict and to be more descriptive
                // Error message already posted by getPipeline, but good to log it here too for worker-specific context
                console.error('Worker: Initialization/load error', initializationError);
                // self.postMessage({ status: 'error', data: `Initialization failed: ${initializationError.message}` }); // Optional: if getPipeline doesn't cover all cases
            }
            break;

        case 'extractFeatures': {
            const { imageUrl, imageId } = data;
            if (!imageUrl) {
                self.postMessage({ status: 'error', imageId, data: 'No image URL provided to worker.' });
                return;
            }

            self.postMessage({ status: 'processing', imageId, data: `Extracting features for image ID: ${imageId}` });
            try {
                const extractor = await getPipeline(); // Ensures pipeline is loaded
                const outputTensor = await extractor(imageUrl, { pooling: 'mean', normalize: true });
                const embedding = outputTensor.data; // This should be a Float32Array

                if (!embedding || typeof embedding.length === 'undefined') {
                    throw new Error('Worker: Failed to extract a valid embedding vector.');
                }
                
                // For Float32Array, sending the array directly is fine.
                // For very large data, consider transferring ArrayBuffer:
                // self.postMessage({ status: 'extraction_complete', imageId, embedding: embedding.buffer }, [embedding.buffer]);
                // Then reconstruct on the main thread: new Float32Array(event.data.embedding)
                self.postMessage({
                    status: 'extraction_complete',
                    imageId,
                    embedding: embedding,
                });
            } catch (error) {
                console.error(`Worker: Error extracting features for image ID ${imageId}:`, error);
                self.postMessage({
                    status: 'error',
                    imageId,
                    data: `Error extracting features: ${error.message || 'Unknown error'}`
                });
            }
            break;
        }
        default:
            console.warn(`Worker: Unknown message type received: ${type}`);
            self.postMessage({ status: 'warn', data: `Unknown message type: ${type}` });
    }
});

// Inform the main thread that the worker has started and is ready for the 'load' command.
// This can be useful for debugging worker loading issues.
self.postMessage({ status: 'worker_started', data: 'Image feature extraction worker started successfully.' }); 