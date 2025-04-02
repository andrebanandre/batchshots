'use client';

import { useEffect, useRef, useState } from 'react';
import { inferenceUpscale } from '../utils/predict';
import { ensureModelsLoaded } from '../utils/modelHelper';

export default function TestPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const [upscaledImage, setUpscaledImage] = useState<ImageData | null>(null);
  const [upscaleTime, setUpscaleTime] = useState<number | null>(null);
  const [upscaleLoading, setUpscaleLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize model and OpenCV
  useEffect(() => {
    // Preload model
    setModelsLoading(true);
    ensureModelsLoaded()
      .then(() => {
        setModelsLoading(false);
        console.log('Model preloaded successfully');
      })
      .catch(e => {
        console.error('Failed to preload model:', e);
        setModelsLoading(false);
      });
      
    // Check if OpenCV is already loaded
    if (window.cv && typeof window.cv.imread === 'function') {
      setOpencvLoaded(true);
      return;
    }
    
    // Add event listener for when OpenCV becomes available
    const handleOpenCvReady = () => {
      console.log('OpenCV is ready for use');
      setOpencvLoaded(true);
    };
    
    window.addEventListener('opencv-ready', handleOpenCvReady);
    
    // Clean up
    return () => {
      window.removeEventListener('opencv-ready', handleOpenCvReady);
    };
  }, []);

  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setUpscaledImage(null);
      setUpscaleTime(null);
      setError(null);
    }
  };

  // Function to run upscaling inference
  const runUpscaling = async () => {
    if (!selectedImage || !opencvLoaded || !imageRef.current) {
      if (!opencvLoaded) {
        setError('OpenCV is not yet loaded. Please wait...');
      }
      return;
    }

    setUpscaleLoading(true);
    setError(null);
    
    try {
      console.log("Starting upscaling process...");
      
      console.log("Running model inference...");
      const [imageData, time] = await inferenceUpscale(imageRef.current);
      console.log(`Got upscaled result: ${imageData.width}x${imageData.height}`);
      
      setUpscaledImage(imageData);
      setUpscaleTime(time);
      
      // Display upscaled image on the result canvas
      if (resultCanvasRef.current && imageData) {
        const ctx = resultCanvasRef.current.getContext('2d');
        if (ctx) {
          // Resize canvas to fit the upscaled image
          resultCanvasRef.current.width = imageData.width;
          resultCanvasRef.current.height = imageData.height;
          
          // Clear canvas first
          ctx.clearRect(0, 0, imageData.width, imageData.height);
          
          // Put the image data
          ctx.putImageData(imageData, 0, 0);
          console.log("Successfully displayed upscaled image");
          
          // As a fallback, also try drawing the ImageData another way
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = imageData.width;
          tempCanvas.height = imageData.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(imageData, 0, 0);
            // Draw the temporary canvas to our result canvas
            ctx.drawImage(tempCanvas, 0, 0);
          }
        } else {
          console.error("Failed to get canvas context");
        }
      } else {
        console.error("Canvas reference or image data is missing");
      }
    } catch (err) {
      console.error('Upscaling error:', err);
      setError(`Error running upscaling: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpscaleLoading(false);
    }
  };

  // Draw the image on canvas when selected
  useEffect(() => {
    if (selectedImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx && imageRef.current) {
        const img = imageRef.current;
        img.onload = () => {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Calculate dimensions to maintain aspect ratio
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          );
          
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          
          // Draw image
          ctx.drawImage(
            img,
            x,
            y,
            img.width * scale,
            img.height * scale
          );
        };
        img.src = selectedImage;
      }
    }
  }, [selectedImage]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Image Upscaler</h1>
      <p className="mb-4">
        Upload an image and enhance it with the super-resolution model.
      </p>
      
      {(!opencvLoaded || modelsLoading) && (
        <div className="mb-4 p-4 border rounded bg-yellow-50">
          <p className="text-yellow-800">
            {!opencvLoaded && <span>Loading OpenCV.js...</span>}
            {modelsLoading && <span>{opencvLoaded ? '' : ' and '}Loading ONNX model...</span>}
          </p>
        </div>
      )}
      
      <div className="mb-4 p-4 border rounded bg-blue-50">
        <h2 className="text-xl mb-2">Select an image</h2>
        <div>
          <label htmlFor="image-upload" className="block mb-2">Upload image:</label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="border p-2 w-full max-w-md"
            disabled={!opencvLoaded || modelsLoading}
          />
        </div>
      </div>

      {selectedImage && (
        <div className="mb-4">
          <h2 className="text-xl mb-2">Selected Image</h2>
          <div className="border p-2 inline-block">
            <canvas
              ref={canvasRef}
              width={224}
              height={224}
              className="bg-gray-100"
            />
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Selected"
              style={{ display: 'none' }}
            />
          </div>
          
          <div className="mt-4">
            <button
              onClick={runUpscaling}
              disabled={upscaleLoading || !opencvLoaded || modelsLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {upscaleLoading ? 'Running Upscaler...' : 'Upscale Image'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="my-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {upscaledImage && (
        <div className="w-full mt-6">
          <h2 className="text-xl mb-2">Upscaled Result</h2>
          <p className="mb-2">Inference time: {upscaleTime?.toFixed(4)}s</p>
          <p className="mb-2 text-sm text-gray-600">
            The upscaling model enhances details while maintaining the original color profile.
          </p>
          
          <div className="border p-2 inline-block max-w-full overflow-auto">
            <canvas
              ref={resultCanvasRef}
              className="bg-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  );
} 