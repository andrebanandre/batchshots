import { ImageFile } from '../components/ImagePreview';

// Worker state
let worker: Worker | null = null;
let isWorkerInitialized = false;
let isWorkerInitializing = false;
let isWebGPUAvailable = false;
let processingQueue: {
  resolve: () => void;
  reject: (error: Error) => void;
  imageFile: ImageFile | null;
}[] = [];

// Initialize the worker
export const initializeBackgroundWorker = () => {
  if (typeof window === 'undefined' || !window.Worker) {
    return Promise.reject(new Error('Web workers not supported in this environment'));
  }

  return new Promise<void>((resolve, reject) => {
    if (isWorkerInitialized) {
      resolve();
      return;
    }

    if (isWorkerInitializing) {
      // Add to queue and wait for initialization to complete
      processingQueue.push({
        resolve: () => resolve(),
        reject,
        imageFile: null
      });
      return;
    }

    isWorkerInitializing = true;

    try {
      worker = new Worker(new URL('../[locale]/background-removal/background-removal.worker.js', import.meta.url));

      worker.addEventListener('message', (event) => {
        const { status, data } = event.data;

        switch (status) {
          case 'webgpu_available':
            isWebGPUAvailable = true;
            console.log('✅ WebGPU detected - using RMBG-1.4 with WebGPU acceleration');
            break;
          case 'webgpu_unavailable':
            isWebGPUAvailable = false;
            console.log('ℹ️ WebGPU not available - using RMBG-1.4 with WASM');
            break;
          case 'ready':
            isWorkerInitialized = true;
            isWorkerInitializing = false;

            // Process any queued items
            processingQueue.forEach(({ resolve }) => resolve());
            processingQueue = [];

            console.log(`Background removal model ready (RMBG-1.4 with ${isWebGPUAvailable ? 'WebGPU' : 'WASM'})`);
            resolve();
            break;
          case 'error':
            if (isWorkerInitializing) {
              isWorkerInitializing = false;
              reject(new Error(data));

              // Reject all queued promises
              processingQueue.forEach(({ reject: rejectFn }) => rejectFn(new Error(data)));
              processingQueue = [];
            }
            break;
        }
      });

      // Load the model
      worker.postMessage({ type: 'load' });
    } catch (error) {
      isWorkerInitializing = false;
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

// Get WebGPU availability status
export const isWebGPUEnabled = (): boolean => {
  return isWebGPUAvailable;
};

// Convert base64 data to Blob
const base64ToBlob = async (base64Data: string, type: string): Promise<Blob> => {
  // For data URLs, we need to remove the prefix
  const base64 = base64Data.split(',')[1];
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type });
};

// Process an image to remove background
export const processImageBackground = async (imageFile: ImageFile): Promise<Blob> => {
  if (!worker) {
    await initializeBackgroundWorker();
  }

  return new Promise<Blob>((resolve, reject) => {
    if (!worker) {
      reject(new Error('Background removal worker is not available'));
      return;
    }

    // Convert data URL to blob
    const fetchImageBlob = async (dataUrl: string): Promise<Blob> => {
      const response = await fetch(dataUrl);
      return await response.blob();
    };

    const handleMessage = (event: MessageEvent) => {
      const { status, imageId, base64Data, blobType, data } = event.data;
      
      if (imageId !== imageFile.id) return; // Not our message
      
      if (status === 'complete') {
        worker?.removeEventListener('message', handleMessage);
        
        // Convert base64 data to blob
        base64ToBlob(base64Data, blobType || 'image/png')
          .then(blob => resolve(blob))
          .catch(error => reject(new Error(`Failed to create blob: ${error.message}`)));
      } else if (status === 'error') {
        worker?.removeEventListener('message', handleMessage);
        reject(new Error(data));
      }
    };

    // Listen for messages from the worker
    worker.addEventListener('message', handleMessage);

    // Send the image to the worker for processing
    if (!imageFile.dataUrl) {
      worker.removeEventListener('message', handleMessage);
      reject(new Error('No image data URL available'));
      return;
    }
    
    fetchImageBlob(imageFile.dataUrl)
      .then(blob => {
        worker?.postMessage({
          type: 'process',
          data: {
            imageId: imageFile.id,
            imageData: blob
          }
        });
      })
      .catch(error => {
        worker?.removeEventListener('message', handleMessage);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
};

// Update image file with the processed background removed version
export const getUpdatedImageWithBackground = (originalImage: ImageFile, processedBlob: Blob): ImageFile => {
  const processedDataUrl = URL.createObjectURL(processedBlob);
  
  return {
    ...originalImage,
    dataUrl: processedDataUrl,
    thumbnailDataUrl: processedDataUrl,
    backgroundRemoved: true,
    processedBlob
  };
};

// Terminate the worker when not needed anymore
export const cleanupBackgroundWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
    isWorkerInitialized = false;
    isWorkerInitializing = false;
  }
}; 