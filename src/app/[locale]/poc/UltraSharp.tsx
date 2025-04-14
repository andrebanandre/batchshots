'use client';

import React, { useRef, useState, useEffect } from 'react';
// Don't import directly - use dynamic import
// import * as ort from 'onnxruntime-web/all';

interface ImageSize {
  w: number;
  h: number;
}

interface BoxDimensions {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ORT will be loaded dynamically
type OrtType = typeof import('onnxruntime-web/all');

// Define types for ONNX session and tensor inputs/outputs
interface TensorData {
  dims: number[];
  data: Float32Array;
}

interface TensorFeed {
  // Using unknown instead of any to satisfy linter
  [key: string]: unknown;
}

interface SessionResults {
  [key: string]: TensorData;
}

interface SessionAPI {
  run: (feeds: TensorFeed) => Promise<SessionResults>;
}

const UltraSharp: React.FC = () => {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const esrganCanvasRef = useRef<HTMLCanvasElement>(null);
  const ultrasharpCanvasRef = useRef<HTMLCanvasElement>(null);
  const realWebPhotoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ort, setOrt] = useState<OrtType | null>(null);
  const [isOrtLoaded, setIsOrtLoaded] = useState(false);

  // Load ORT only on client side
  useEffect(() => {
    // Only import in browser environment
    if (typeof window !== 'undefined') {
      import('onnxruntime-web/all')
        .then((ortModule) => {
          setOrt(ortModule);
          setIsOrtLoaded(true);
          // Set log level after loading
          ortModule.env.logLevel = 'warning';
        })
        .catch((error) => {
          console.error('Failed to load ONNX Runtime:', error);
          setErrorMessage('Failed to load ONNX Runtime.');
        });
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImageFile(files[0]);
      displayOriginalImage(files[0]);
    }
  };

  const displayOriginalImage = (file: File) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Calculate dimensions to maintain aspect ratio
      const aspectRatio = img.width / img.height;
      const canvasWidth = Math.min(1024, img.width); // Limit max width for display
      const canvasHeight = canvasWidth / aspectRatio;
      
      // Resize canvas to match image aspect ratio
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Also set the same size for output canvases
      if (esrganCanvasRef.current) {
        esrganCanvasRef.current.width = canvasWidth;
        esrganCanvasRef.current.height = canvasHeight;
      }
      if (ultrasharpCanvasRef.current) {
        ultrasharpCanvasRef.current.width = canvasWidth;
        ultrasharpCanvasRef.current.height = canvasHeight;
      }
      if (realWebPhotoCanvasRef.current) {
        realWebPhotoCanvasRef.current.width = canvasWidth;
        realWebPhotoCanvasRef.current.height = canvasHeight;
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const processImage = async () => {
    if (!imageFile) {
      setErrorMessage('Please upload an image first');
      return;
    }

    if (!isOrtLoaded || !ort) {
      setErrorMessage('ONNX Runtime is not loaded yet');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const canvas = originalCanvasRef.current;
      if (!canvas) throw new Error('Canvas not found');

      // Process sequentially instead of in parallel
      try {
        // Process with ESRGAN first
        await processWithRealESRGAN(canvas);
        
        // Then process with UltraSharp
        await processWithUltraSharp(canvas);
        
        // Finally process with RealWebPhoto
        await processWithRealWebPhoto(canvas);
      } catch (error) {
        console.error('Model processing error:', error);
        setErrorMessage('Error during model processing. Check console for details.');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setErrorMessage('Error during image processing. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process image with Real-ESRGAN model
  const processWithRealESRGAN = async (sourceCanvas: HTMLCanvasElement) => {
    if (!ort) return;
    
    let session: unknown = null;
    const startTime = performance.now();
    let usedProvider = '';
    
    try {
      // Get session with fallback mechanism
      const [esrganSession, ep] = await getORTSession('/models/Real-ESRGAN-x4plus.onnx');
      if (!esrganSession) throw new Error('Failed to create inference session for Real-ESRGAN');
      
      session = esrganSession;
      usedProvider = ep || 'unknown';
      console.log(`Using execution provider for Real-ESRGAN: ${ep}`);

      // Use correct input size for Real-ESRGAN model
      const inputSize: ImageSize = {w: 128, h: 128}; // Specific size for Real-ESRGAN
      
      // Create a padded square canvas to preserve aspect ratio
      const paddedCanvas = createPaddedCanvas(sourceCanvas, inputSize);
      
      // Convert to tensor format
      const {float32Array, shape} = canvasToFloat32Array(paddedCanvas);
      
      // Create input tensor
      const inputTensor = new ort.Tensor("float32", float32Array, shape);

      // Run inference with input name "image" for Real-ESRGAN
      const feeds = { image: inputTensor };
      console.log('Real-ESRGAN input tensor shape:', shape);
      
      // Use try-catch to handle WebGPU specific errors
      let results;
      try {
        // Cast to proper session API
        const sessionAPI = session as SessionAPI;
        console.log(`Starting Real-ESRGAN inference on ${usedProvider}...`);
        const inferenceStartTime = performance.now();
        results = await sessionAPI.run(feeds);
        const inferenceEndTime = performance.now();
        console.log(`Real-ESRGAN inference completed in ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`);
      } catch (inferenceError) {
        console.error('WebGPU inference failed for Real-ESRGAN, falling back to CPU', inferenceError);
        
        // Fallback to CPU if WebGPU fails
        const [cpuSession] = await getORTSession('/models/Real-ESRGAN-x4plus.onnx', ['cpu']);
        if (!cpuSession) throw new Error('Failed to create CPU fallback session for Real-ESRGAN');
        
        // Cast to proper session API
        const cpuSessionAPI = cpuSession as SessionAPI;
        usedProvider = 'cpu';
        console.log('Starting Real-ESRGAN inference on CPU (fallback)...');
        const inferenceStartTime = performance.now();
        results = await cpuSessionAPI.run(feeds);
        const inferenceEndTime = performance.now();
        console.log(`Real-ESRGAN inference completed in ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`);
      }

      // Display the result
      const outputCanvas = esrganCanvasRef.current;
      if (!outputCanvas) throw new Error('ESRGAN output canvas not found');
      
      // Get the output dimensions - Real-ESRGAN output tensor is named "upscaled_image"
      // The output is 4x the input size (512x512 for 128x128 input)
      const outputData = results.upscaled_image.data as Float32Array;
      const outputShape = results.upscaled_image.dims;
      console.log('Real-ESRGAN output tensor shape:', outputShape);
      
      // Process the model output
      const [, , modelOutputHeight, modelOutputWidth] = outputShape;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = modelOutputWidth;
      tempCanvas.height = modelOutputHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Cannot get temp context');
      
      // Create ImageData for the upscaled model result
      const modelOutputData = tempCtx.createImageData(modelOutputWidth, modelOutputHeight);
      const pixelCount = modelOutputHeight * modelOutputWidth;
      
      // Convert NCHW to RGBA
      for (let h = 0; h < modelOutputHeight; h++) {
        for (let w = 0; w < modelOutputWidth; w++) {
          const pixelIdx = h * modelOutputWidth + w;
          const outIdx = pixelIdx * 4;
          
          // Convert from NCHW format (assuming RGB channels)
          modelOutputData.data[outIdx] = Math.max(0, Math.min(255, outputData[pixelIdx] * 255)); // R
          modelOutputData.data[outIdx + 1] = Math.max(0, Math.min(255, outputData[pixelIdx + pixelCount] * 255)); // G
          modelOutputData.data[outIdx + 2] = Math.max(0, Math.min(255, outputData[pixelIdx + 2 * pixelCount] * 255)); // B
          modelOutputData.data[outIdx + 3] = 255; // Alpha
        }
      }
      
      // Put the temp image data on the temp canvas
      tempCtx.putImageData(modelOutputData, 0, 0);
      
      // Now draw the temp canvas onto the output canvas, respecting aspect ratio
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) throw new Error('Cannot get output 2D context');
      
      // Clear the output canvas
      outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      
      // Draw the upscaled content onto the output canvas, respecting aspect ratio
      outputCtx.drawImage(tempCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
      
      // Add performance metrics as overlay
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      outputCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      outputCtx.fillRect(0, 0, 220, 40);
      outputCtx.fillStyle = 'white';
      outputCtx.font = '12px Arial';
      outputCtx.textAlign = 'left';
      outputCtx.fillText(`Time: ${totalTime.toFixed(0)}ms (${usedProvider})`, 10, 15);
      outputCtx.fillText(`Model Output: ${modelOutputWidth}x${modelOutputHeight}`, 10, 30);
    } catch (error) {
      console.error('Real-ESRGAN model inference error:', error);
      setErrorMessage('Error processing with Real-ESRGAN. Check console for details.');
      
      // Show error in canvas
      const errorCanvas = esrganCanvasRef.current;
      if (errorCanvas) {
        const ctx = errorCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffdddd';
          ctx.fillRect(0, 0, errorCanvas.width, errorCanvas.height);
          ctx.fillStyle = '#990000';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Real-ESRGAN processing failed', errorCanvas.width/2, errorCanvas.height/2);
          ctx.font = '12px Arial';
          ctx.fillText('See console for details', errorCanvas.width/2, errorCanvas.height/2 + 24);
        }
      }
    }
  };

  // Process image with UltraSharp model
  const processWithUltraSharp = async (sourceCanvas: HTMLCanvasElement) => {
    if (!ort) return;
    
    let session: unknown = null;
    const startTime = performance.now();
    
    try {
      // Force CPU for UltraSharp as WebGPU is consistently failing with memory allocation errors
      const [ultraSharpSession, ep] = await getORTSession('/models/4x-UltraSharp-fp32-opset17.onnx', ['cpu']);
      if (!ultraSharpSession) throw new Error('Failed to create inference session for UltraSharp');
      
      session = ultraSharpSession;
      console.log(`Using execution provider for UltraSharp: ${ep}`);

      // Use smaller input size for UltraSharp
      const inputSize: ImageSize = {w: 160, h: 160}; // Smaller size for UltraSharp
      
      // Create a padded square canvas to preserve aspect ratio
      const paddedCanvas = createPaddedCanvas(sourceCanvas, inputSize);
      
      // Convert to tensor format
      const {float32Array, shape} = canvasToFloat32Array(paddedCanvas);
      
      // Create input tensor
      const inputTensor = new ort.Tensor("float32", float32Array, shape);

      // Run inference with input name "input" for UltraSharp
      const feeds = { input: inputTensor };
      console.log('UltraSharp input tensor shape:', shape);
      
      // Cast to proper session API
      const sessionAPI = session as SessionAPI;
      console.log('Starting UltraSharp inference on CPU...');
      const inferenceStartTime = performance.now();
      const results = await sessionAPI.run(feeds);
      const inferenceEndTime = performance.now();
      console.log(`UltraSharp inference completed in ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`);

      // Display the result
      const outputCanvas = ultrasharpCanvasRef.current;
      if (!outputCanvas) throw new Error('UltraSharp output canvas not found');
      
      // Get the output dimensions - UltraSharp output tensor is named "output"
      const outputData = results.output.data as Float32Array;
      const outputShape = results.output.dims;
      console.log('UltraSharp output tensor shape:', outputShape);
      
      // Process the model output
      const [, , modelOutputHeight, modelOutputWidth] = outputShape;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = modelOutputWidth;
      tempCanvas.height = modelOutputHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Cannot get temp context');
      
      // Create ImageData for the upscaled model result
      const modelOutputData = tempCtx.createImageData(modelOutputWidth, modelOutputHeight);
      const pixelCount = modelOutputHeight * modelOutputWidth;
      
      // Convert NCHW to RGBA
      for (let h = 0; h < modelOutputHeight; h++) {
        for (let w = 0; w < modelOutputWidth; w++) {
          const pixelIdx = h * modelOutputWidth + w;
          const outIdx = pixelIdx * 4;
          
          // Convert from NCHW format (assuming RGB channels)
          modelOutputData.data[outIdx] = Math.max(0, Math.min(255, outputData[pixelIdx] * 255)); // R
          modelOutputData.data[outIdx + 1] = Math.max(0, Math.min(255, outputData[pixelIdx + pixelCount] * 255)); // G
          modelOutputData.data[outIdx + 2] = Math.max(0, Math.min(255, outputData[pixelIdx + 2 * pixelCount] * 255)); // B
          modelOutputData.data[outIdx + 3] = 255; // Alpha
        }
      }
      
      // Put the temp image data on the temp canvas
      tempCtx.putImageData(modelOutputData, 0, 0);
      
      // Now draw the temp canvas onto the output canvas, respecting aspect ratio
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) throw new Error('Cannot get output 2D context');
      
      // Clear the output canvas
      outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      
      // Draw the upscaled content onto the output canvas, respecting aspect ratio
      outputCtx.drawImage(tempCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
      
      // Add performance metrics as overlay
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      outputCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      outputCtx.fillRect(0, 0, 220, 40);
      outputCtx.fillStyle = 'white';
      outputCtx.font = '12px Arial';
      outputCtx.textAlign = 'left';
      outputCtx.fillText(`Time: ${totalTime.toFixed(0)}ms (CPU)`, 10, 15);
      outputCtx.fillText(`Model Output: ${modelOutputWidth}x${modelOutputHeight}`, 10, 30);
    } catch (error) {
      console.error('UltraSharp model inference error:', error);
      setErrorMessage('Error processing with UltraSharp. Check console for details.');
      
      // Clear the canvas with an error message
      const errorCanvas = ultrasharpCanvasRef.current;
      if (errorCanvas) {
        const ctx = errorCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffdddd';
          ctx.fillRect(0, 0, errorCanvas.width, errorCanvas.height);
          ctx.fillStyle = '#990000';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('UltraSharp processing failed', errorCanvas.width/2, errorCanvas.height/2);
          ctx.font = '12px Arial';
          ctx.fillText('See console for details', errorCanvas.width/2, errorCanvas.height/2 + 24);
        }
      }
    }
  };

  // Process image with RealWebPhoto model
  const processWithRealWebPhoto = async (sourceCanvas: HTMLCanvasElement) => {
    if (!ort) return;
    
    let session: unknown = null;
    const startTime = performance.now();
    let usedProvider = '';
    
    try {
      // Try WebGPU first, with CPU as fallback
      const [realWebPhotoSession, ep] = await getORTSession('/models/4xRealWebPhoto_v4_fp32_opset17.onnx', ['webgpu', 'cpu']);
      if (!realWebPhotoSession) throw new Error('Failed to create inference session for RealWebPhoto');
      
      session = realWebPhotoSession;
      usedProvider = ep || 'unknown';
      console.log(`Using execution provider for RealWebPhoto: ${ep}`);

      // Use similar input size as UltraSharp
      const inputSize: ImageSize = {w: 160, h: 160};
      
      // Create a padded square canvas to preserve aspect ratio
      const paddedCanvas = createPaddedCanvas(sourceCanvas, inputSize);
      
      // Convert to tensor format
      const {float32Array, shape} = canvasToFloat32Array(paddedCanvas);
      
      // Create input tensor - assume "input" like UltraSharp based on naming convention
      const inputTensor = new ort.Tensor("float32", float32Array, shape);

      // Run inference with input name "input" for RealWebPhoto
      const feeds = { input: inputTensor };
      console.log('RealWebPhoto input tensor shape:', shape);
      
      // Use try-catch to handle WebGPU specific errors
      let results;
      try {
        // Cast to proper session API
        const sessionAPI = session as SessionAPI;
        console.log(`Starting RealWebPhoto inference on ${usedProvider}...`);
        const inferenceStartTime = performance.now();
        results = await sessionAPI.run(feeds);
        const inferenceEndTime = performance.now();
        console.log(`RealWebPhoto inference completed in ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`);
      } catch (inferenceError) {
        console.error('WebGPU inference failed for RealWebPhoto, falling back to CPU', inferenceError);
        
        // Fallback to CPU if WebGPU fails
        const [cpuSession] = await getORTSession('/models/4xRealWebPhoto_v4_fp32_opset17.onnx', ['cpu']);
        if (!cpuSession) throw new Error('Failed to create CPU fallback session for RealWebPhoto');
        
        // Cast to proper session API
        const cpuSessionAPI = cpuSession as SessionAPI;
        usedProvider = 'cpu';
        console.log('Starting RealWebPhoto inference on CPU (fallback)...');
        const inferenceStartTime = performance.now();
        results = await cpuSessionAPI.run(feeds);
        const inferenceEndTime = performance.now();
        console.log(`RealWebPhoto inference completed in ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`);
      }

      // Display the result
      const outputCanvas = realWebPhotoCanvasRef.current;
      if (!outputCanvas) throw new Error('RealWebPhoto output canvas not found');
      
      // Get the output dimensions - assume "output" like UltraSharp based on naming convention
      const outputData = results.output.data as Float32Array;
      const outputShape = results.output.dims;
      console.log('RealWebPhoto output tensor shape:', outputShape);
      
      // Process the model output
      const [, , modelOutputHeight, modelOutputWidth] = outputShape;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = modelOutputWidth;
      tempCanvas.height = modelOutputHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Cannot get temp context');
      
      // Create ImageData for the upscaled model result
      const modelOutputData = tempCtx.createImageData(modelOutputWidth, modelOutputHeight);
      const pixelCount = modelOutputHeight * modelOutputWidth;
      
      // Convert NCHW to RGBA
      for (let h = 0; h < modelOutputHeight; h++) {
        for (let w = 0; w < modelOutputWidth; w++) {
          const pixelIdx = h * modelOutputWidth + w;
          const outIdx = pixelIdx * 4;
          
          // Convert from NCHW format (assuming RGB channels)
          modelOutputData.data[outIdx] = Math.max(0, Math.min(255, outputData[pixelIdx] * 255)); // R
          modelOutputData.data[outIdx + 1] = Math.max(0, Math.min(255, outputData[pixelIdx + pixelCount] * 255)); // G
          modelOutputData.data[outIdx + 2] = Math.max(0, Math.min(255, outputData[pixelIdx + 2 * pixelCount] * 255)); // B
          modelOutputData.data[outIdx + 3] = 255; // Alpha
        }
      }
      
      // Put the temp image data on the temp canvas
      tempCtx.putImageData(modelOutputData, 0, 0);
      
      // Now draw the temp canvas onto the output canvas, respecting aspect ratio
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) throw new Error('Cannot get output 2D context');
      
      // Clear the output canvas
      outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      
      // Draw the upscaled content onto the output canvas, respecting aspect ratio
      outputCtx.drawImage(tempCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
      
      // Add performance metrics as overlay
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      outputCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      outputCtx.fillRect(0, 0, 220, 40);
      outputCtx.fillStyle = 'white';
      outputCtx.font = '12px Arial';
      outputCtx.textAlign = 'left';
      outputCtx.fillText(`Time: ${totalTime.toFixed(0)}ms (${usedProvider})`, 10, 15);
      outputCtx.fillText(`Model Output: ${modelOutputWidth}x${modelOutputHeight}`, 10, 30);
    } catch (error) {
      console.error('RealWebPhoto model inference error:', error);
      setErrorMessage('Error processing with RealWebPhoto. Check console for details.');
      
      // Clear the canvas with an error message
      const errorCanvas = realWebPhotoCanvasRef.current;
      if (errorCanvas) {
        const ctx = errorCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffdddd';
          ctx.fillRect(0, 0, errorCanvas.width, errorCanvas.height);
          ctx.fillStyle = '#990000';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('RealWebPhoto processing failed', errorCanvas.width/2, errorCanvas.height/2);
          ctx.font = '12px Arial';
          ctx.fillText('See console for details', errorCanvas.width/2, errorCanvas.height/2 + 24);
        }
      }
    }
  };

  // Helper function to get ORT session with fallback
  async function getORTSession(modelPath: string, preferredEPs: string[] = ["webgpu", "cpu"]): Promise<[unknown | null, string | null]> {
    if (!ort) return [null, null];
    
    let session = null;
    for (const ep of preferredEPs) {
      try { 
        const options = { executionProviders: [ep] };
        session = await ort.InferenceSession.create(modelPath, options);
        return [session, ep];
      }
      catch (e) { 
        console.error(`Failed to initialize with ${ep}:`, e); 
        continue;
      }
    }
    return [null, null];
  }

  // Resize canvas to target size with proper padding to preserve aspect ratio
  function createPaddedCanvas(sourceCanvas: HTMLCanvasElement, targetSize: ImageSize): HTMLCanvasElement {
    // Get source dimensions
    const sourceDim: ImageSize = {
      w: sourceCanvas.width,
      h: sourceCanvas.height
    };
    
    // Calculate positioning to preserve aspect ratio
    const box = resizeAndPadBox(sourceDim, targetSize);
    
    // Create new canvas with target dimensions
    const canvas = document.createElement('canvas');
    canvas.width = targetSize.w;
    canvas.height = targetSize.h;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Clear with black background for padding
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetSize.w, targetSize.h);
      
      // Draw the image with proper positioning and dimensions
      ctx.drawImage(
        sourceCanvas,
        0, 0, sourceDim.w, sourceDim.h,
        box.x, box.y, box.w, box.h
      );
    }
    
    return canvas;
  }
  
  // Calculate padding and position to preserve aspect ratio
  function resizeAndPadBox(sourceDim: ImageSize, targetDim: ImageSize): BoxDimensions {
    if (sourceDim.h == sourceDim.w) {
      return { x: 0, y: 0, w: targetDim.w, h: targetDim.h };
    } else if (sourceDim.h > sourceDim.w) {
      // portrait => resize and pad left/right
      const newW = sourceDim.w / sourceDim.h * targetDim.h;
      const padLeft = Math.floor((targetDim.w - newW) / 2);
      
      return { x: padLeft, y: 0, w: newW, h: targetDim.h };
    } else {
      // landscape => resize and pad top/bottom
      const newH = sourceDim.h / sourceDim.w * targetDim.w;
      const padTop = Math.floor((targetDim.h - newH) / 2);
      
      return { x: 0, y: padTop, w: targetDim.w, h: newH };
    }
  }

  // Convert canvas to Float32Array for tensor input
  function canvasToFloat32Array(canvas: HTMLCanvasElement): {float32Array: Float32Array, shape: number[]} {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const shape = [1, 3, canvas.height, canvas.width]; // NCHW format

    const redArray: number[] = [];
    const greenArray: number[] = [];
    const blueArray: number[] = [];

    for (let i = 0; i < imageData.length; i += 4) {
      redArray.push(imageData[i] / 255.0);
      greenArray.push(imageData[i + 1] / 255.0);
      blueArray.push(imageData[i + 2] / 255.0);
      // skip data[i + 3] to filter out the alpha channel
    }

    const transposedData = [...redArray, ...greenArray, ...blueArray];
    
    const float32Array = new Float32Array(transposedData);
    return {float32Array, shape};
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Image
        </label>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={!isOrtLoaded}
            className={`block w-full text-sm ${
              isOrtLoaded 
                ? "text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                : "cursor-not-allowed text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-500"
            }`}
          />
          {!isOrtLoaded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-500">Loading ONNX Runtime...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div>
          <p className="text-sm font-medium mb-2">Original Image</p>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <canvas 
              ref={originalCanvasRef} 
              width={512} 
              height={512} 
              className="w-full bg-gray-50"
            />
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium mb-2">Real-ESRGAN (4x)</p>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <canvas 
              ref={esrganCanvasRef} 
              width={512} 
              height={512} 
              className="w-full bg-gray-50"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">UltraSharp (4x)</p>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <canvas 
              ref={ultrasharpCanvasRef} 
              width={512} 
              height={512} 
              className="w-full bg-gray-50"
            />
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium mb-2">RealWebPhoto (4x)</p>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <canvas 
              ref={realWebPhotoCanvasRef} 
              width={512} 
              height={512} 
              className="w-full bg-gray-50"
            />
          </div>
        </div>
      </div>
      
      {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
      )}
      
      <button
        onClick={processImage}
        disabled={!imageFile || isProcessing || !isOrtLoaded}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : !isOrtLoaded ? 'Loading ONNX Runtime...' : 'Enhance with All Models'}
      </button>
      
      <div className="text-xs text-gray-500 space-y-1">
        <p>Note: This compares 3 different models for 4x image upscaling.</p>
        <p className="ml-4">• Real-ESRGAN: General purpose upscaler with good photo quality</p>
        <p className="ml-4">• UltraSharp: General image sharpener and detail enhancer</p>
        <p className="ml-4">• RealWebPhoto: Photography restoration for JPEG/WEBP compression removal</p>
      </div>
    </div>
  );
};

export default UltraSharp; 