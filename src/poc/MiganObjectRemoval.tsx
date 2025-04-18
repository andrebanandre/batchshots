// 'use client';

// import React, { useRef, useState, useEffect } from 'react';
// import ReactCanvasDraw from 'react-canvas-draw';
// import { initOpenCV } from '../../lib/imageProcessing';
// import Button from '../../components/Button';
// import Loader from '../../components/Loader';

// // ORT will be loaded dynamically
// type OrtType = typeof import('onnxruntime-web/all');

// // Define types for ONNX session and tensor inputs/outputs
// interface TensorData {
//   dims: number[];
//   data: Float32Array;
// }

// interface TensorFeed {
//   // Using unknown instead of any to satisfy linter
//   [key: string]: unknown;
// }

// interface SessionResults {
//   [key: string]: TensorData;
// }

// interface SessionAPI {
//   run: (feeds: TensorFeed) => Promise<SessionResults>;
// }

// const MiganObjectRemoval: React.FC = () => {
//   const originalCanvasRef = useRef<HTMLCanvasElement>(null);
//   const outputCanvasRef = useRef<HTMLCanvasElement>(null);
//   const drawingCanvasRef = useRef<ReactCanvasDraw>(null);
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [ort, setOrt] = useState<OrtType | null>(null);
//   const [isOrtLoaded, setIsOrtLoaded] = useState(false);
//   const [brushSize, setBrushSize] = useState<number>(15);
//   const [brushColor] = useState<string>("rgba(255,0,0,0.5)");
//   const [imageDimensions, setImageDimensions] = useState({ width: 512, height: 512 });
//   const [isOpenCVLoaded, setIsOpenCVLoaded] = useState(false);
//   const [backgroundImage, setBackgroundImage] = useState<string>("");
//   const [processingStage, setProcessingStage] = useState<string>("");

//   // Load ORT and OpenCV on client side
//   useEffect(() => {
//     // Only import in browser environment
//     if (typeof window !== 'undefined') {
//       // Load ONNX Runtime
//       import('onnxruntime-web/all')
//         .then((ortModule) => {
//           setOrt(ortModule);
//           setIsOrtLoaded(true);
//           // Set log level after loading
//           ortModule.env.logLevel = 'warning';
//         })
//         .catch((error) => {
//           console.error('Failed to load ONNX Runtime:', error);
//           setErrorMessage('Failed to load ONNX Runtime.');
//         });
      
//       // Initialize OpenCV
//       initOpenCV()
//         .then(() => {
//           console.log('OpenCV loaded successfully for Migan component');
//           setIsOpenCVLoaded(true);
//         })
//         .catch((error) => {
//           console.error('Failed to load OpenCV:', error);
//         });
//     }
//   }, []);

//   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files;
//     if (files && files.length > 0) {
//       setImageFile(files[0]);
//       displayOriginalImage(files[0]);
//     }
//   };

//   const displayOriginalImage = (file: File) => {
//     const canvas = originalCanvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext('2d', { alpha: true });
//     if (!ctx) return;

//     const img = new Image();
//     img.onload = () => {
//       // Calculate dimensions to maintain aspect ratio
//       const aspectRatio = img.width / img.height;
//       const canvasWidth = Math.min(512, img.width); // Limit max width for display
//       const canvasHeight = canvasWidth / aspectRatio;
      
//       // Resize canvas to match image aspect ratio
//       canvas.width = canvasWidth;
//       canvas.height = canvasHeight;
      
//       // Draw image with white background first (for transparent PNGs)
//       ctx.fillStyle = "#ffffff";
//       ctx.fillRect(0, 0, canvas.width, canvas.height);
      
//       // Draw image
//       ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

//       // Also set the same size for output canvas
//       if (outputCanvasRef.current) {
//         outputCanvasRef.current.width = canvasWidth;
//         outputCanvasRef.current.height = canvasHeight;
//       }

//       // Get the data URL to use as the background for the drawing canvas
//       const dataUrl = canvas.toDataURL('image/png');
//       setBackgroundImage(dataUrl);

//       // Update dimensions for drawing canvas
//       setImageDimensions({
//         width: canvasWidth,
//         height: canvasHeight
//       });

//       // Clear any previous drawing
//       if (drawingCanvasRef.current) {
//         drawingCanvasRef.current.clear();
//       }
//     };
//     img.src = URL.createObjectURL(file);
//   };

//   const clearMask = () => {
//     if (drawingCanvasRef.current) {
//       drawingCanvasRef.current.clear();
//     }
//   };

//   const resetImage = () => {
//     if (imageFile) {
//       displayOriginalImage(imageFile);
//       clearMask();
//     }
//   };

//   const canvasToUint8Array = (canvas: HTMLCanvasElement): {uint8Array: Uint8Array, shape: number[]} => {
//     const ctx = canvas.getContext("2d");
//     if (!ctx) throw new Error("Could not get canvas context");
    
//     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
//     const shape = [1, 3, canvas.height, canvas.width]; // NCHW format

//     // For uint8, we don't normalize to 0-1 range
//     const redArray: number[] = [];
//     const greenArray: number[] = [];
//     const blueArray: number[] = [];

//     for (let i = 0; i < imageData.length; i += 4) {
//       // Handle transparency by blending with white background
//       const alpha = imageData[i + 3] / 255;
//       // If pixel is transparent, use white (255) as background
//       const r = alpha < 1 ? Math.round(imageData[i] * alpha + 255 * (1 - alpha)) : imageData[i];
//       const g = alpha < 1 ? Math.round(imageData[i + 1] * alpha + 255 * (1 - alpha)) : imageData[i + 1];
//       const b = alpha < 1 ? Math.round(imageData[i + 2] * alpha + 255 * (1 - alpha)) : imageData[i + 2];
      
//       redArray.push(r);         // R (0-255)
//       greenArray.push(g);       // G (0-255)
//       blueArray.push(b);        // B (0-255)
//     }

//     const transposedData = [...redArray, ...greenArray, ...blueArray];
    
//     const uint8Array = new Uint8Array(transposedData);
//     return {uint8Array, shape};
//   };

//   const maskCanvasToUint8Array = (drawingCanvas: HTMLCanvasElement, targetWidth: number, targetHeight: number): {uint8Array: Uint8Array, shape: number[]} => {
//     // Create a temporary canvas for processing the mask
//     const tempCanvas = document.createElement('canvas');
//     tempCanvas.width = targetWidth;
//     tempCanvas.height = targetHeight;
//     const tempCtx = tempCanvas.getContext('2d', { alpha: true });
    
//     if (!tempCtx) {
//       throw new Error("Could not get canvas context for mask processing");
//     }
    
//     // Clear the canvas with black
//     tempCtx.fillStyle = "black";
//     tempCtx.fillRect(0, 0, targetWidth, targetHeight);
    
//     // Draw the drawing canvas onto the temp canvas, potentially resizing it
//     tempCtx.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 0, 0, targetWidth, targetHeight);
    
//     // Get the image data
//     const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
//     const data = imageData.data;
    
//     // For Migan, we need a single-channel tensor with shape [1, 1, height, width]
//     // IMPORTANT: INVERTING MASK VALUES - Now 0 = area to inpaint (remove), 255 = area to keep
//     const shape = [1, 1, targetHeight, targetWidth];
//     const maskArray = new Uint8Array(targetWidth * targetHeight);
    
//     // Extract mask data - Mark pixels that user has drawn on for inpainting
//     let maskPixelCount = 0;
//     for (let y = 0; y < targetHeight; y++) {
//       for (let x = 0; x < targetWidth; x++) {
//         const i = (y * targetWidth + x) * 4;
//         // Check if this pixel has been drawn on (red with sufficient alpha)
//         const isDrawnPixel = (data[i] > 50) && (data[i+3] > 20) && 
//                             (data[i] > data[i+1] * 1.5) && (data[i] > data[i+2] * 1.5);
        
//         // INVERTED MASK: 0 for areas to inpaint, 255 for areas to keep
//         maskArray[y * targetWidth + x] = isDrawnPixel ? 0 : 255; 
//         if (isDrawnPixel) maskPixelCount++;
//       }
//     }
    
//     console.log(`Created mask with ${maskPixelCount} pixels to inpaint out of ${targetWidth * targetHeight} total pixels`);
    
//     // Only proceed if we actually have some pixels to inpaint
//     if (maskPixelCount === 0) {
//       console.warn("No mask pixels detected! Please draw on the areas you want to remove.");
//     } else if (maskPixelCount === (targetWidth * targetHeight)) {
//       console.warn("The entire image is masked! Please draw only on the areas you want to remove.");
//     }
    
//     // Visualization code for debugging
//     const debugCanvas = document.createElement('canvas');
//     debugCanvas.width = targetWidth;
//     debugCanvas.height = targetHeight;
//     const debugCtx = debugCanvas.getContext('2d');
    
//     if (debugCtx) {
//       const debugImgData = debugCtx.createImageData(targetWidth, targetHeight);
//       for (let i = 0; i < maskArray.length; i++) {
//         // For visualization: Show red where we'll inpaint (mask value = 0)
//         const showInpaint = maskArray[i] === 0;
//         const idx = i * 4;
//         debugImgData.data[idx] = showInpaint ? 255 : 0;     // R
//         debugImgData.data[idx + 1] = 0;   // G
//         debugImgData.data[idx + 2] = 0;   // B
//         debugImgData.data[idx + 3] = 255; // Alpha
//       }
//       debugCtx.putImageData(debugImgData, 0, 0);
      
//       // Log mask visualization for debugging
//       console.log('Mask visualization (red=areas to inpaint):', debugCanvas.toDataURL());
//     }
    
//     return { uint8Array: maskArray, shape };
//   };

//   const processImageWithMask = async () => {
//     if (!imageFile) {
//       setErrorMessage('Please upload an image first');
//       return;
//     }

//     if (!isOrtLoaded || !ort) {
//       setErrorMessage('ONNX Runtime is not loaded yet');
//       return;
//     }

//     if (!drawingCanvasRef.current) {
//       setErrorMessage('Drawing canvas not found');
//       return;
//     }

//     setIsProcessing(true);
//     setProcessingStage('Loading model...');
//     setErrorMessage(null);

//     try {
//       // Get the original image canvas
//       const imageCanvas = originalCanvasRef.current;
//       if (!imageCanvas) throw new Error('Image canvas not found');

//       // Get the drawing canvas - access canvas.drawing directly 
//       if (!drawingCanvasRef.current.canvas || !drawingCanvasRef.current.canvas.drawing) {
//         throw new Error('Drawing canvas not available');
//       }
//       const drawingCanvas = drawingCanvasRef.current.canvas.drawing;
      
//       const outputCanvas = outputCanvasRef.current;
      
//       if (!outputCanvas) throw new Error('Output canvas not found');

//       // STEP 1: Ensure original input is valid
//       console.log('===== STEP 1: Validate original input =====');
//       // Display the original image in console
//       console.log('Original image:', imageCanvas.toDataURL());
      
//       // Create a session for the Migan model
//       // Force CPU for Migan since WebGPU doesn't support the required data type
//       setProcessingStage('Creating model session...');
//       const [miganSession, ep] = await getORTSession('/models/migan_pipeline_v2.onnx', ["cpu"]);
//       if (!miganSession) throw new Error('Failed to create inference session for Migan');
      
//       console.log(`Using execution provider for Migan: ${ep}`);

//       // STEP 2: Generate and visualize the mask
//       console.log('===== STEP 2: Generate and visualize mask =====');
//       setProcessingStage('Processing mask...');
      
//       // Extract the drawing (mask) from the canvas
//       // Draw it to the output canvas to check if mask is working
//       const maskOnlyCanvas = document.createElement('canvas');
//       maskOnlyCanvas.width = imageCanvas.width;
//       maskOnlyCanvas.height = imageCanvas.height;
//       const maskCtx = maskOnlyCanvas.getContext('2d');
      
//       if (maskCtx) {
//         // Draw the mask
//         maskCtx.drawImage(drawingCanvas, 0, 0, drawingCanvas.width, drawingCanvas.height, 
//                            0, 0, maskOnlyCanvas.width, maskOnlyCanvas.height);
        
//         // Show the mask alone
//         console.log('Mask only drawing:', maskOnlyCanvas.toDataURL());
        
//         // Draw mask on output first as a test
//         const outputCtx = outputCanvas.getContext('2d');
//         if (outputCtx) {
//           // Clear output canvas
//           outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
          
//           // First draw original
//           outputCtx.drawImage(imageCanvas, 0, 0);
          
//           // Then overlay mask in red (semi-transparent)
//           outputCtx.globalAlpha = 0.4;
//           outputCtx.globalCompositeOperation = 'source-over';
//           outputCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
//           outputCtx.drawImage(maskOnlyCanvas, 0, 0);
//           outputCtx.globalAlpha = 1.0;
          
//           console.log('Debug output with mask overlay:', outputCanvas.toDataURL());
//         }
//       }

//       // Convert image to tensor
//       setProcessingStage('Preparing tensors...');
//       const {uint8Array: imageArray, shape: imageShape} = canvasToUint8Array(imageCanvas);
//       const imageTensor = new ort.Tensor("uint8", imageArray, imageShape);

//       // Convert mask drawing to tensor
//       const {uint8Array: maskArray, shape: maskShape} = maskCanvasToUint8Array(
//         drawingCanvas, 
//         imageCanvas.width, 
//         imageCanvas.height
//       );
//       const maskTensor = new ort.Tensor("uint8", maskArray, maskShape);
      
//       // STEP 3: Run model inference
//       console.log('===== STEP 3: Run model inference =====');
//       // Set up the model inputs
//       const feeds = {
//         "image": imageTensor,
//         "mask": maskTensor
//       };

//       console.log('Running Migan inference with input shapes:', {
//         image: `${imageShape[0]}x${imageShape[1]}x${imageShape[2]}x${imageShape[3]}`,
//         mask: `${maskShape[0]}x${maskShape[1]}x${maskShape[2]}x${maskShape[3]}`
//       });
      
//       // Run the model
//       try {
//         setProcessingStage('Running model...');
//         const sessionAPI = miganSession as SessionAPI;
//         console.log('Starting Migan inference...');
//         const results = await sessionAPI.run(feeds);
        
//         // STEP 4: Process and visualize model output
//         console.log('===== STEP 4: Process model output =====');
//         console.log('Available outputs:', Object.keys(results));
        
//         // Find the output tensor
//         let outputData: Uint8Array | Float32Array;
//         let outputShape: number[];
        
//         if (!results || Object.keys(results).length === 0) {
//           throw new Error('Model returned empty results');
//         }
        
//         if (results.output) {
//           console.log('Using "output" tensor');
//           outputData = results.output.data as Uint8Array | Float32Array;
//           outputShape = results.output.dims;
//         } else if (results.result) {
//           console.log('Using "result" tensor');
//           outputData = results.result.data as Uint8Array | Float32Array;
//           outputShape = results.result.dims;
//         } else {
//           // Try to find the output tensor with a different name
//           const outputKeys = Object.keys(results);
//           if (outputKeys.length === 0) {
//             throw new Error('No output tensors returned from model');
//           }
          
//           // Use the first output tensor
//           const outputKey = outputKeys[0];
//           console.log(`Using "${outputKey}" as output tensor`);
//           outputData = results[outputKey].data as Uint8Array | Float32Array;
//           outputShape = results[outputKey].dims;
//         }
        
//         if (!outputData || !outputShape) {
//           throw new Error('Invalid output tensor data or shape');
//         }
        
//         console.log('Output tensor shape:', outputShape);
//         console.log('Output data type:', outputData.constructor.name);
        
//         // CRITICAL: Let's check if we're actually getting the expected RGB data
//         // Take small sample of values for debugging
//         const samples = [];
//         for (let i = 0; i < Math.min(20, outputData.length); i++) {
//           samples.push(outputData[i]);
//         }
//         console.log('Output samples (first 20 values):', samples);
        
//         // Process the model output (assuming NCHW format)
//         const [batchSize, channels, outputHeight, outputWidth] = outputShape;
        
//         console.log(`Output dimensions: ${batchSize}x${channels}x${outputHeight}x${outputWidth}`);
        
//         if (channels !== 3) {
//           console.warn(`Expected 3 channels (RGB) but got ${channels} channels`);
//         }
        
//         // Create a temporary canvas to hold the processed image
//         const tempCanvas = document.createElement('canvas');
//         tempCanvas.width = outputWidth;
//         tempCanvas.height = outputHeight;
//         const tempCtx = tempCanvas.getContext('2d');
//         if (!tempCtx) throw new Error('Cannot get temp context');
        
//         // Create an ImageData object to hold the pixel data
//         const outputImageData = tempCtx.createImageData(outputWidth, outputHeight);
//         const pixelCount = outputHeight * outputWidth;
        
//         // Calculate appropriate scaling based on sample values
//         let minSample = Number.MAX_VALUE;
//         let maxSample = Number.MIN_VALUE;
        
//         for (let i = 0; i < Math.min(1000, outputData.length); i++) {
//           const val = Number(outputData[i]);
//           if (val < minSample) minSample = val;
//           if (val > maxSample) maxSample = val;
//         }
        
//         console.log(`Output range: min=${minSample}, max=${maxSample}`);
        
//         // Determine scaling factor
//         let scaleFactor = 1;
//         if (maxSample <= 1.0 && maxSample > 0) {
//           scaleFactor = 255;
//           console.log('Using 0-1 range scaling (x255)');
//         } else {
//           console.log('Using 0-255 range (no scaling)');
//         }
        
//         console.log(`Converting tensor to image (${outputWidth}x${outputHeight}, ${channels} channels)...`);
        
//         // This is the critical part - we need to ensure we're correctly interpreting the tensor data
//         try {
//           // Convert from NCHW format to RGBA
//           setProcessingStage('Rendering result...');
          
//           // For RGB data in NCHW format (batch, channels, height, width)
//           for (let h = 0; h < outputHeight; h++) {
//             for (let w = 0; w < outputWidth; w++) {
//               const outIdx = (h * outputWidth + w) * 4; // RGBA output index
              
//               // Calculate indexes for each channel in NCHW format
//               const rIdx = h * outputWidth + w; // R channel
//               const gIdx = pixelCount + h * outputWidth + w; // G channel (offset by image size)
//               const bIdx = 2 * pixelCount + h * outputWidth + w; // B channel (offset by 2x image size)
              
//               // Get RGB values and apply scaling
//               const r = Math.max(0, Math.min(255, Number(outputData[rIdx]) * scaleFactor));
//               const g = Math.max(0, Math.min(255, Number(outputData[gIdx]) * scaleFactor));
//               const b = Math.max(0, Math.min(255, Number(outputData[bIdx]) * scaleFactor));
              
//               // Set RGBA values in output image data
//               outputImageData.data[outIdx] = r;     // R
//               outputImageData.data[outIdx + 1] = g; // G
//               outputImageData.data[outIdx + 2] = b; // B
//               outputImageData.data[outIdx + 3] = 255; // A (fully opaque)
//             }
//           }
          
//           // Put the image data to the canvas
//           tempCtx.putImageData(outputImageData, 0, 0);
          
//           // Log a sample of the converted pixel data
//           console.log('Sample of converted pixels (first 5 pixels):');
//           for (let i = 0; i < 5; i++) {
//             const idx = i * 4;
//             console.log(`Pixel ${i}: R=${outputImageData.data[idx]}, G=${outputImageData.data[idx+1]}, B=${outputImageData.data[idx+2]}`);
//           }
          
//           // STEP 5: Display the final result
//           console.log('===== STEP 5: Display final result =====');
//           console.log('Generated output image:', tempCanvas.toDataURL());
          
//           // Draw the temp canvas onto the output canvas
//           const outputCtx = outputCanvas.getContext('2d');
//           if (!outputCtx) throw new Error('Cannot get output 2D context');
          
//           // Clear the output canvas
//           outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
          
//           // Draw the processed content, respecting aspect ratio
//           outputCtx.drawImage(tempCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
          
//         } catch (error) {
//           console.error('Error processing output tensor:', error);
//           setErrorMessage(`Error processing model output: ${error instanceof Error ? error.message : 'Unknown error'}`);
//         }

//       } catch (inferenceError) {
//         console.error('Error during inference execution:', inferenceError);
        
//         // Try to extract detailed error information
//         const errorMessage = inferenceError instanceof Error ? 
//           inferenceError.message : 'Unknown inference error';
//         const errorDetails = inferenceError instanceof Error && 
//           'stack' in inferenceError ? inferenceError.stack : '';
          
//         console.error('Error details:', errorDetails);
        
//         setErrorMessage(`Model inference failed: ${errorMessage}`);
//         throw inferenceError;
//       }
//     } catch (error) {
//       console.error('Processing error:', error);
//       setErrorMessage(`Error during image processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     } finally {
//       setIsProcessing(false);
//       setProcessingStage('');
//     }
//   };

//   // Helper function to get ORT session with fallback
//   async function getORTSession(modelPath: string, preferredEPs: string[] = ["cpu"]): Promise<[unknown | null, string | null]> {
//     if (!ort) return [null, null];
    
//     let session = null;
//     let lastError = null;
    
//     console.log(`Attempting to create session for ${modelPath} with providers: ${preferredEPs.join(', ')}`);
    
//     // Force CPU only for Migan model to avoid WebGPU GatherND errors
//     if (modelPath.includes('migan')) {
//       console.log('Forcing CPU execution provider for Migan model to avoid WebGPU errors');
//       preferredEPs = ['cpu'];
//     }
    
//     for (const ep of preferredEPs) {
//       try { 
//         console.log(`Trying execution provider: ${ep}`);
//         const options = { executionProviders: [ep] };
//         const startTime = performance.now();
//         session = await ort.InferenceSession.create(modelPath, options);
//         const endTime = performance.now();
        
//         console.log(`Successfully created session with ${ep} in ${(endTime - startTime).toFixed(2)}ms`);
        
//         // Log the model's input info
//         if (session) {
//           try {
//             // Cast to access internal properties safely
//             const sessionCast = session as unknown as Record<string, unknown>;
//             if (typeof sessionCast.inputNames === 'object' && sessionCast.inputNames) {
//               const inputs = sessionCast.inputNames as string[];
//               const inputInfo: Record<string, unknown> = {};
              
//               for (const input of inputs) {
//                 if (typeof sessionCast.inputMetadata === 'function') {
//                   const info = sessionCast.inputMetadata(input) as Record<string, unknown>;
//                   inputInfo[input] = {
//                     dimensions: info.dimensions,
//                     dataType: info.dataType
//                   };
//                 }
//               }
//               console.log('Model input requirements:', inputInfo);
//             }
//           } catch (e) {
//             console.warn('Could not get model input info:', e);
//           }
//         }
        
//         return [session, ep];
//       }
//       catch (e) { 
//         console.error(`Failed to initialize with ${ep}:`, e);
//         lastError = e;
//         continue;
//       }
//     }
    
//     // Include detailed error information when all providers fail
//     if (lastError) {
//       console.error('All execution providers failed. Last error:', lastError);
//       const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
//       const errorStack = lastError instanceof Error && lastError.stack ? lastError.stack : '';
//       console.error('Error details:', errorMessage, errorStack);
//     }
    
//     return [null, null];
//   }

//   const downloadImage = () => {
//     const canvas = outputCanvasRef.current;
//     if (!canvas) return;

//     const dataUrl = canvas.toDataURL('image/png');
//     const link = document.createElement('a');
//     link.href = dataUrl;
//     link.download = 'migan-processed.png';
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   return (
//     <div className="flex flex-col items-center gap-6">
//       <div className="w-full">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Upload Image for Object Removal
//         </label>
//         <div className="relative">
//           <input
//             type="file"
//             accept="image/*"
//             onChange={handleImageUpload}
//             disabled={!isOrtLoaded || isProcessing}
//             className={`block w-full text-sm ${
//               isOrtLoaded && !isProcessing
//                 ? "text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
//                 : "cursor-not-allowed text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-500"
//             }`}
//           />
//           {(!isOrtLoaded || !isOpenCVLoaded) && (
//             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//               <div className="flex items-center space-x-2">
//                 <div className="h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
//                 <span className="text-sm text-gray-500">
//                   Loading {!isOrtLoaded ? 'ONNX Runtime' : 'OpenCV'}...
//                 </span>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
      
//       <div className="flex flex-col md:flex-row justify-center items-start gap-4 w-full">
//         <div className="flex flex-col items-center">
//           <p className="text-sm font-medium mb-2">Original Image</p>
//           <div className="border border-gray-300 rounded-lg overflow-hidden">
//             <canvas 
//               ref={originalCanvasRef} 
//               width={512} 
//               height={512} 
//               className="bg-gray-50"
//             />
//           </div>
//         </div>

//         <div className="flex flex-col items-center">
//           <p className="text-sm font-medium mb-2">Draw Mask Over Objects to Remove</p>
//           <div className="border border-gray-300 rounded-lg overflow-hidden">
//             <ReactCanvasDraw
//               ref={drawingCanvasRef}
//               brushRadius={brushSize}
//               brushColor={brushColor}
//               canvasWidth={imageDimensions.width}
//               canvasHeight={imageDimensions.height}
//               hideGrid={true}
//               lazyRadius={0}
//               imgSrc={backgroundImage}
//               hideInterface={false}
//             />
//           </div>
//           <div className="mt-2 flex items-center space-x-4">
//             <div>
//               <label className="block text-xs text-gray-600 mb-1">Brush Size</label>
//               <input 
//                 type="range" 
//                 min="5" 
//                 max="50" 
//                 value={brushSize} 
//                 onChange={(e) => setBrushSize(parseInt(e.target.value))}
//                 className="w-24"
//               />
//             </div>
//             <button
//               onClick={clearMask}
//               disabled={isProcessing}
//               className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-xs hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
//             >
//               Clear Mask
//             </button>
//           </div>
//         </div>

//         <div className="flex flex-col items-center">
//           <p className="text-sm font-medium mb-2">Processed Image</p>
//           <div className="border border-gray-300 rounded-lg overflow-hidden">
//             <canvas 
//               ref={outputCanvasRef} 
//               width={512} 
//               height={512} 
//               className="bg-gray-50"
//             />
//           </div>
//         </div>
//       </div>
      
//       {errorMessage && (
//         <div className="text-red-500 text-sm">{errorMessage}</div>
//       )}
      
//       <div className="flex space-x-4">
//         <button
//           onClick={resetImage}
//           disabled={!imageFile || isProcessing}
//           className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
//         >
//           Reset
//         </button>
//         <div className="flex justify-center items-center">
//           {isProcessing ? (
//             <div className="flex items-center gap-2">
//               <Loader size="sm" />
//               <span>{processingStage || "Processing..."}</span>
//             </div>
//           ) : (
//             <Button onClick={processImageWithMask} disabled={!imageFile || !isOrtLoaded || !isOpenCVLoaded}>Remove objects</Button>
//           )}
//         </div>
//         <button
//           onClick={downloadImage}
//           disabled={!imageFile || isProcessing}
//           className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
//         >
//           Download
//         </button>
//       </div>
      
//       <div className="text-xs text-gray-500 space-y-1 max-w-lg text-center">
//         <p>Instructions:</p>
//         <p>1. Upload an image</p>
//         <p>2. Draw a mask over the object you want to remove</p>
//         <p>3. Click &quot;Remove Object&quot; to process the image</p>
//         <p>4. Download the result if you&apos;re satisfied</p>
//       </div>
//     </div>
//   );
// };

// export default MiganObjectRemoval; 