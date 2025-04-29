// src/app/lib/objectRemovalProcessing.ts

// Use the specific type from the /all import path
import type * as ortAllType from 'onnxruntime-web/all';
// Keep base ortType for Tensor etc if needed, or adjust below
import type * as ortBaseType from 'onnxruntime-web';

// Re-export ORT type based on the /all structure
export type OrtType = typeof ortAllType;

// Define types for ONNX session and tensor inputs/outputs
export interface TensorData {
  dims: number[];
  data: Float32Array | Uint8Array;
}

export interface TensorFeed {
  [key: string]: ortBaseType.Tensor; // Use base type for Tensor compatibility
}

export interface SessionResults {
  [key: string]: TensorData;
}

// Minimal interface for the session run method
export interface SessionAPI {
  run: (feeds: TensorFeed) => Promise<Record<string, ortBaseType.Tensor>>;
}

/**
 * Converts an HTMLCanvasElement's content to a Uint8Array in NCHW format.
 * Assumes RGB format and handles transparency by blending with white.
 * @param canvas The source canvas.
 * @returns An object containing the Uint8Array data and the shape [1, 3, height, width].
 */
export const canvasToUint8Array = (canvas: HTMLCanvasElement): { uint8Array: Uint8Array, shape: number[] } => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const shape = [1, 3, canvas.height, canvas.width]; // NCHW format

    const redArray: number[] = [];
    const greenArray: number[] = [];
    const blueArray: number[] = [];

    for (let i = 0; i < imageData.length; i += 4) {
      // Handle transparency by blending with white background
      const alpha = imageData[i + 3] / 255;
      const r = alpha < 1 ? Math.round(imageData[i] * alpha + 255 * (1 - alpha)) : imageData[i];
      const g = alpha < 1 ? Math.round(imageData[i + 1] * alpha + 255 * (1 - alpha)) : imageData[i + 1];
      const b = alpha < 1 ? Math.round(imageData[i + 2] * alpha + 255 * (1 - alpha)) : imageData[i + 2];

      redArray.push(r);         // R (0-255)
      greenArray.push(g);       // G (0-255)
      blueArray.push(b);        // B (0-255)
    }

    const transposedData = [...redArray, ...greenArray, ...blueArray];
    const uint8Array = new Uint8Array(transposedData);
    return { uint8Array, shape };
};

/**
 * Converts a drawing/mask canvas to a Uint8Array suitable for the Migan model.
 * Creates an inverted mask (0 for inpaint, 255 for keep).
 * @param drawingCanvas The canvas containing the user's drawing (e.g., from ReactSketchCanvas export).
 * @param targetWidth The desired width of the mask tensor.
 * @param targetHeight The desired height of the mask tensor.
 * @returns An object containing the Uint8Array mask data and the shape [1, 1, height, width].
 */
export const maskCanvasToUint8Array = (
    drawingCanvas: HTMLCanvasElement | HTMLImageElement,
    targetWidth: number,
    targetHeight: number
): { uint8Array: Uint8Array, shape: number[] } => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext('2d', { alpha: true });

    if (!tempCtx) {
        throw new Error("Could not get canvas context for mask processing");
    }

    // Clear the canvas with black
    tempCtx.fillStyle = "black";
    tempCtx.fillRect(0, 0, targetWidth, targetHeight);

    // Draw the drawing canvas/image onto the temp canvas
    tempCtx.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 0, 0, targetWidth, targetHeight);

    const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;

    // Migan expects shape [1, 1, height, width], inverted (0=inpaint, 255=keep)
    const shape = [1, 1, targetHeight, targetWidth];
    const maskArray = new Uint8Array(targetWidth * targetHeight);
    let maskPixelCount = 0;

    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const i = (y * targetWidth + x) * 4;
            // Check if pixel was drawn (red with sufficient alpha)
            const isDrawnPixel = (data[i] > 50) && (data[i+3] > 20) &&
                                 (data[i] > data[i+1] * 1.5) && (data[i] > data[i+2] * 1.5);

            maskArray[y * targetWidth + x] = isDrawnPixel ? 0 : 255; // Invert
            if (isDrawnPixel) maskPixelCount++;
        }
    }

    console.log(`Created mask with ${maskPixelCount} pixels to inpaint out of ${targetWidth * targetHeight} total pixels`);

    if (maskPixelCount === 0) {
        console.warn("No mask pixels detected! Please draw on the areas you want to remove.");
        // Optional: throw an error or return null/undefined if no mask drawn
        // throw new Error("No mask drawn.");
    } else if (maskPixelCount === (targetWidth * targetHeight)) {
        console.warn("The entire image is masked! Please draw only on the areas you want to remove.");
        // Optional: throw an error
        // throw new Error("Entire image masked.");
    }

    // --- Optional Mask Debug Visualization ---
    // const debugCanvas = document.createElement('canvas');
    // debugCanvas.width = targetWidth;
    // debugCanvas.height = targetHeight;
    // const debugCtx = debugCanvas.getContext('2d');
    // if (debugCtx) {
    //   const debugImgData = debugCtx.createImageData(targetWidth, targetHeight);
    //   for (let i = 0; i < maskArray.length; i++) {
    //     const showInpaint = maskArray[i] === 0;
    //     const idx = i * 4;
    //     debugImgData.data[idx] = showInpaint ? 255 : 0; // R
    //     debugImgData.data[idx + 1] = 0; // G
    //     debugImgData.data[idx + 2] = 0; // B
    //     debugImgData.data[idx + 3] = 255; // Alpha
    //   }
    //   debugCtx.putImageData(debugImgData, 0, 0);
    //   console.log('Mask visualization (red=areas to inpaint):', debugCanvas.toDataURL());
    // }
    // --- End Debug ---

    return { uint8Array: maskArray, shape };
};


/**
 * Processes an image using an object removal model (e.g., Migan).
 * @param ort The initialized ONNX Runtime instance (should match OrtType from /all).
 * @param session The ONNX InferenceSession.
 * @param imageCanvas The canvas containing the original image.
 * @param maskImage The mask image element.
 * @returns A Promise resolving to the data URL of the processed image.
 */
export const processImageWithObjectRemoval = async (
    ort: OrtType, // Use the OrtType derived from /all
    session: SessionAPI,
    imageCanvas: HTMLCanvasElement,
    maskImage: HTMLImageElement
): Promise<string> => {

    console.log('===== STEP 1: Validate inputs =====');
    if (!ort) throw new Error('ONNX Runtime instance not provided.');
    if (!session) throw new Error('ONNX Session not provided.');
    if (!imageCanvas) throw new Error('Image canvas not provided.');
    if (!maskImage) throw new Error('Mask image not provided.');

    console.log('Original image canvas dimensions:', imageCanvas.width, 'x', imageCanvas.height);
    console.log('Mask image dimensions:', maskImage.width, 'x', maskImage.height);

    // Create a temporary canvas to draw the mask image for processing
    const maskProcessingCanvas = document.createElement('canvas');
    maskProcessingCanvas.width = imageCanvas.width; // Match image canvas size
    maskProcessingCanvas.height = imageCanvas.height;
    const maskProcessingCtx = maskProcessingCanvas.getContext('2d');
    if (!maskProcessingCtx) {
        throw new Error('Could not get context for mask processing canvas');
    }
    // Draw the mask *image* onto the processing canvas
    maskProcessingCtx.drawImage(maskImage, 0, 0, maskProcessingCanvas.width, maskProcessingCanvas.height);
    console.log('Mask drawn onto processing canvas');


    console.log('===== STEP 2: Prepare Tensors =====');
    const { uint8Array: imageArray, shape: imageShape } = canvasToUint8Array(imageCanvas);
    // Use ort.Tensor directly
    const imageTensor = new ort.Tensor("uint8", imageArray, imageShape);

    const { uint8Array: maskArray, shape: maskShape } = maskCanvasToUint8Array(
        maskProcessingCanvas,
        imageCanvas.width,
        imageCanvas.height
    );
    // Use ort.Tensor directly
    const maskTensor = new ort.Tensor("uint8", maskArray, maskShape);

    const feeds: TensorFeed = {
        "image": imageTensor,
        "mask": maskTensor
    };

    console.log('Running inference with input shapes:', {
        image: imageShape.join('x'),
        mask: maskShape.join('x')
    });

    console.log('===== STEP 3: Run Inference =====');
    let results: Record<string, ortBaseType.Tensor>; // Use base type here for result
    try {
        results = await session.run(feeds);
        console.log('Inference successful. Output keys:', Object.keys(results));
    } catch (inferenceError) {
        console.error('Error during inference execution:', inferenceError);
        const errorMessage = inferenceError instanceof Error ? inferenceError.message : 'Unknown inference error';
        throw new Error(`Model inference failed: ${errorMessage}`);
    }

    console.log('===== STEP 4: Process Output Tensor =====');
    let outputTensor: ortBaseType.Tensor | undefined;
    if (results.output) {
        console.log('Using "output" tensor');
        outputTensor = results.output;
    } else if (results.result) {
        console.log('Using "result" tensor');
        outputTensor = results.result;
    } else {
        const outputKeys = Object.keys(results);
        if (outputKeys.length > 0) {
            const outputKey = outputKeys[0];
            console.log(`Using first available output tensor: "${outputKey}"`);
            outputTensor = results[outputKey];
        } else {
            throw new Error('No output tensors returned from model');
        }
    }

    if (!outputTensor || !outputTensor.data || !outputTensor.dims) {
        throw new Error('Invalid output tensor data or shape');
    }

    const outputData = outputTensor.data as Uint8Array | Float32Array;
    const outputShape = outputTensor.dims;

    console.log('Output tensor shape:', outputShape.join('x'));
    console.log('Output data type:', outputData.constructor.name);

    // --- Output tensor sanity check ---
    // const samples = [];
    // for (let i = 0; i < Math.min(20, outputData.length); i++) { samples.push(outputData[i]); }
    // console.log('Output samples (first 20 values):', samples);
    // ---

    const [batchSize, channels, outputHeight, outputWidth] = outputShape;
    console.log(`Output dimensions: ${batchSize}x${channels}x${outputHeight}x${outputWidth}`);

    if (channels !== 3) {
        console.warn(`Expected 3 channels (RGB) but got ${channels}. Processing may be incorrect.`);
        // Handle potential grayscale or other formats if necessary, or throw error
    }

    // --- Determine Scaling ---
    // let minSample = Number.MAX_VALUE, maxSample = Number.MIN_VALUE;
    // for (let i = 0; i < Math.min(1000, outputData.length); i++) {
    //     const val = Number(outputData[i]);
    //     if (val < minSample) minSample = val;
    //     if (val > maxSample) maxSample = val;
    // }
    // console.log(`Output range (sample): min=${minSample}, max=${maxSample}`);
    // let scaleFactor = (maxSample <= 1.0 && maxSample > 0) ? 255 : 1;
    // console.log(`Using scale factor: ${scaleFactor}`);
    // --- Defaulting scale factor for simplicity now ---
    const scaleFactor = (outputData instanceof Float32Array) ? 255 : 1; // Assume float is 0-1, uint8 is 0-255


    console.log('===== STEP 5: Render Output to Canvas =====');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = outputWidth;
    tempCanvas.height = outputHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Cannot get temp canvas context');

    const outputImageData = tempCtx.createImageData(outputWidth, outputHeight);
    const pixelCount = outputHeight * outputWidth;

    try {
        // Convert NCHW tensor to RGBA ImageData
        for (let h = 0; h < outputHeight; h++) {
            for (let w = 0; w < outputWidth; w++) {
                const outIdx = (h * outputWidth + w) * 4; // RGBA output index
                const rIdx = h * outputWidth + w;
                const gIdx = pixelCount + rIdx;
                const bIdx = 2 * pixelCount + rIdx;

                const r = Math.max(0, Math.min(255, Number(outputData[rIdx]) * scaleFactor));
                const g = Math.max(0, Math.min(255, Number(outputData[gIdx]) * scaleFactor));
                const b = Math.max(0, Math.min(255, Number(outputData[bIdx]) * scaleFactor));

                outputImageData.data[outIdx] = r;     // R
                outputImageData.data[outIdx + 1] = g; // G
                outputImageData.data[outIdx + 2] = b; // B
                outputImageData.data[outIdx + 3] = 255; // A (fully opaque)
            }
        }

        tempCtx.putImageData(outputImageData, 0, 0);
        console.log('Output successfully rendered to temporary canvas.');

        // Return the data URL of the final image
        // Using PNG to preserve quality after generation
        const finalDataUrl = tempCanvas.toDataURL('image/png');
        console.log('===== Processing Complete =====');
        return finalDataUrl;

    } catch (error) {
        console.error('Error converting output tensor to image data:', error);
        throw new Error(`Error processing model output: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};


/**
 * Creates an ONNX Inference Session, trying preferred execution providers with fallback.
 * Forces CPU for Migan model to avoid potential WebGPU issues.
 * @param ort The initialized ONNX Runtime instance (should match OrtType from /all).
 * @param modelPath Path to the ONNX model file.
 * @param preferredEPs Array of preferred execution providers (e.g., ['webgpu', 'cpu']).
 * @returns A Promise resolving to the created session and the used execution provider, or [null, null] if failed.
 */
export async function getObjectRemovalORTSession(
    ort: OrtType, // Use OrtType derived from /all
    modelPath: string,
    preferredEPs: string[] = ["webgpu", "cpu"]
): Promise<[ortBaseType.InferenceSession | null, string | null]> { // Return base InferenceSession type
    if (!ort) {
         console.error("ORT instance not available for session creation.");
         return [null, null];
    }

    let session: ortBaseType.InferenceSession | null = null;
    let lastError: Error | unknown = null;
    let usedEP: string | null = null;

    console.log(`Attempting to create session for ${modelPath}`);

    const forceCpu = modelPath.includes('migan');
    if (forceCpu) {
        console.log('Forcing CPU execution provider for Migan model.');
        preferredEPs = ['cpu'];
    } else {
        if (!preferredEPs.includes('cpu')) {
            preferredEPs.push('cpu');
        }
    }

    const uniqueEPs = [...new Set(preferredEPs)];

    for (const ep of uniqueEPs) {
        try {
            console.log(`Trying execution provider: ${ep}`);
            const options: ortBaseType.InferenceSession.SessionOptions = { executionProviders: [ep] };
            const startTime = performance.now();
            session = await ort.InferenceSession.create(modelPath, options);
            const endTime = performance.now();
            usedEP = ep;
            console.log(`Successfully created session with ${ep} in ${(endTime - startTime).toFixed(2)}ms`);

            try {
                console.log('Model Input Names:', session.inputNames);
                console.log('Model Output Names:', session.outputNames);
            } catch (metaError) {
                 console.warn('Could not log model input/output names:', metaError);
            }

            break;
        } catch (e) {
            console.warn(`Failed to initialize session with ${ep}:`, e);
            lastError = e;
            session = null;
            usedEP = null;
        }
    }

    if (!session) {
         console.error('Failed to create inference session with any provider.');
         if (lastError instanceof Error) {
             console.error('Last error:', lastError.message, lastError.stack);
         } else {
             console.error('Last error:', lastError);
         }
         return [null, null];
    }

    return [session, usedEP];
} 