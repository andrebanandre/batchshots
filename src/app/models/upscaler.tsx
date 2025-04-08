"use client";

import * as React from "react";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import { pipeline, ImageToImagePipeline, RawImage } from "@huggingface/transformers";

interface UpscaleResult {
  output: RawImage | null;
  error: string | null;
  imageUrl: string | null;
}

export default function Upscaler(): React.ReactNode {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [result, setResult] = useState<UpscaleResult>({
    output: null,
    error: null,
    imageUrl: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<Promise<ImageToImagePipeline> | null>(null);

  // Initialize model
  useEffect(() => {
    if (!ref.current) {
      ref.current = pipeline('image-to-image', 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr');
    }
  }, []);

  // Convert RawImage to base64
  function rawImageToBase64(image: RawImage): string {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Convert RGB to RGBA
    const rgbaData = new Uint8ClampedArray(image.width * image.height * 4);
    for (let i = 0; i < image.data.length; i += 3) {
      const rgbaIndex = (i / 3) * 4;
      rgbaData[rgbaIndex] = image.data[i];     // R
      rgbaData[rgbaIndex + 1] = image.data[i + 1]; // G
      rgbaData[rgbaIndex + 2] = image.data[i + 2]; // B
      rgbaData[rgbaIndex + 3] = 255;          // A (fully opaque)
    }
    
    // Create ImageData from the RGBA data
    const imageData = new ImageData(rgbaData, image.width, image.height);
    
    // Put the image data on canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to base64
    return canvas.toDataURL('image/png');
  }

  // Run upscaling when image URL changes
  useEffect(() => {
    if (imageUrl && ref.current) {
      setIsLoading(true);
      ref.current.then(async (upscaler) => {
        try {
          const output = await upscaler(imageUrl);
          const rawImage = output as RawImage;
          const base64Image = rawImageToBase64(rawImage);
          
          setResult({
            output: rawImage,
            error: null,
            imageUrl: base64Image
          });
        } catch (err) {
          console.error('Upscaling error:', err);
          setResult(prev => ({
            ...prev,
            error: `Error: ${err instanceof Error ? err.message : String(err)}`,
            imageUrl: null
          }));
        } finally {
          setIsLoading(false);
        }
      });
    }
  }, [imageUrl]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={imageUrl}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
        placeholder="Enter image URL"
        className="border border-gray-300 rounded p-2 dark:bg-black dark:text-white w-full"
        disabled={isLoading}
      />

      {result.error && (
        <div className="text-red-500 p-2 border border-red-300 rounded">
          {result.error}
        </div>
      )}

      {result.imageUrl && (
        <div className="space-y-2">
          <img 
            src={result.imageUrl} 
            alt="Upscaled" 
            className="max-w-full h-auto border border-gray-300 rounded"
          />
          <pre className="border border-gray-300 rounded p-2 dark:bg-black dark:text-white w-full">
            {JSON.stringify({
              width: result.output?.width,
              height: result.output?.height,
              channels: result.output?.channels
            }, null, 2)}
          </pre>
        </div>
      )}

      {isLoading && (
        <div className="text-gray-500">Processing image...</div>
      )}
    </div>
  );
}