'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useIsPro } from '../../hooks/useIsPro';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ProBadge from '../../components/ProBadge';
import { initOpenCV } from '../../lib/imageProcessing'; // For potential future use or consistency
import Loader from '../../components/Loader';
import { useTranslations } from 'next-intl';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';

// Import the new processing functions and types
import {
    OrtType,
    SessionAPI,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canvasToUint8Array, // Keep for future use or potential refactor
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    maskCanvasToUint8Array, // Keep for future use or potential refactor
    processImageWithObjectRemoval,
    getObjectRemovalORTSession
} from '../../lib/objectRemovalProcessing';
import type { InferenceSession } from 'onnxruntime-web';

// Define interface for a single image being processed
interface ProcessingImageState {
    id: string; // Unique identifier for each image
    file: File | null;
    originalDataUrl: string | null;
    processedDataUrl: string | null;
    dimensions: { width: number; height: number } | null;
    maskDrawn: boolean;
    isSelected: boolean; // For batch processing selection
    isProcessing: boolean; // Individual processing status
    processingStage: string; // Individual stage message
    errorMessage: string | null; // Individual error message
    maskDataUrl?: string | null; // Store the mask specific to this image
}

// Placeholder for translations namespace
const T_NAMESPACE = 'ObjectRemovalPage';

export default function ObjectRemovalPage() {
  const t = useTranslations(T_NAMESPACE);
  const { isProUser, isLoading: isProLoading } = useIsPro();
  const router = useRouter();

  // --- State --- 
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ort, setOrt] = useState<OrtType | null>(null);
  const [isOrtLoaded, setIsOrtLoaded] = useState(false);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [session, setSession] = useState<InferenceSession | null>(null);
  
  // -- State for Multi-Image --
  const [images, setImages] = useState<ProcessingImageState[]>([]); // Ensure this is correctly defined
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [applyMaskToAll, setApplyMaskToAll] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Track if canvas needs to be cleared when switching images
  const [shouldClearCanvas, setShouldClearCanvas] = useState(false);

  // Canvas refs
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<ReactSketchCanvasRef>(null); // Main interaction canvas
  const previousMaskDrawnRef = useRef<boolean>(false);

  // Image state using the new interface (initialized)
  const [imageState, setImageState] = useState<ProcessingImageState>({
      id: "",
      file: null,
      originalDataUrl: null,
      processedDataUrl: null,
      dimensions: null,
      maskDrawn: false,
      isSelected: false,
      isProcessing: true,
      processingStage: t('processing.readingFile'),
      errorMessage: null,
  });
  
  // Drawing Canvas state
  const [backgroundImage, setBackgroundImage] = useState<string>(""); // For sketch canvas bg
  const [brushSize, setBrushSize] = useState<number>(15);
  const [brushColor] = useState<string>("rgba(255,0,0,0.5)");

  // Add a ref to track first draw without causing re-renders
  const maskDrawnRef = useRef<boolean>(false);

  // --- Effects --- 

  // Load ORT and OpenCV
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load ONNX Runtime - Using /all path
      import('onnxruntime-web/all')
        .then((ortModule) => {
          // Remove the cast, type should match now from utility definition
          setOrt(ortModule);
          setIsOrtLoaded(true);
          // ortModule.env.logLevel = 'warning'; // Keep commented out for now
          console.log('ONNX Runtime loaded for Object Removal.');
        })
        .catch((error) => {
          console.error('Failed to load ONNX Runtime:', error);
          setErrorMessage(t('errors.ortLoad'));
        });

      // Initialize OpenCV
      initOpenCV()
        .then(() => {
          console.log('OpenCV loaded successfully for Object Removal component');
          setIsOpenCVReady(true);
        })
        .catch((error) => {
          console.error('Failed to load OpenCV:', error);
          // Don't block functionality if OpenCV fails, but maybe show warning?
        });
    }
  }, [t]);

  // Create ONNX Session when ORT is loaded
  useEffect(() => {
      if (ort && !session) {
          const loadSession = async () => {
              setProcessingStage(t('loading.model'));
              try {
                  const [loadedSession, usedProvider] = await getObjectRemovalORTSession(ort, '/models/migan_pipeline_v2.onnx');
                  if (loadedSession) {
                      setSession(loadedSession);
                      // setSessionEP(usedProvider); // Set state if needed elsewhere
                      console.log(`Object removal session created with ${usedProvider}`); // Log the EP
                  } else {
                      setErrorMessage(t('errors.sessionCreate'));
                  }
              } catch (error) {
                  console.error('Error creating ONNX session:', error);
                  setErrorMessage(t('errors.sessionCreate'));
              } finally {
                 setProcessingStage("");
              }
          };
          loadSession();
      }
  }, [ort, session, t]);

  // Effect 1: Load image, calculate dimensions, set state (including background)
  useEffect(() => {
    // Only run if we have a URL but no dimensions yet
    if (imageState?.originalDataUrl && !imageState?.dimensions) {
      console.log("Effect 1: originalDataUrl changed, loading image for dimensions...");
      const img = new Image();
      img.onload = () => {
        console.log("Effect 1: Image loaded, calculating dimensions...");
        const maxDim = 512;
        let drawWidth = img.width;
        let drawHeight = img.height;
        const aspectRatio = img.width / img.height;
        if (drawWidth > maxDim || drawHeight > maxDim) {
          if (aspectRatio >= 1) {
            drawWidth = maxDim;
            drawHeight = Math.round(maxDim / aspectRatio);
          } else {
            drawHeight = maxDim;
            drawWidth = Math.round(maxDim * aspectRatio);
          }
        }
        console.log(`Effect 1: Calculated dimensions: ${drawWidth}x${drawHeight}`);

        console.log("Effect 1: Updating image state with dimensions...");
        setImageState(prevState => ({
            ...prevState,
            dimensions: { width: drawWidth, height: drawHeight },
        }));
        
        console.log("Effect 1: Setting background image state...");
        if (imageState.originalDataUrl) { // Check again just in case
             setBackgroundImage(imageState.originalDataUrl);
        }
        console.log("Effect 1 finished.");
        // Still processing until Effect 2 draws
      };
      img.onerror = (err) => {
        console.error("Effect 1: Image load error:", err);
        setErrorMessage(t('errors.imageLoad'));
        setIsProcessing(false); 
        setProcessingStage("");
      };
      img.src = imageState.originalDataUrl;
    } else if (imageState && !imageState.originalDataUrl) {
        // Clean up background if URL is removed (reset)
         if (backgroundImage !== "") {
              console.log("Effect 1: Cleaning up background image due to null URL");
              setBackgroundImage("");
         }
    }
  }, [imageState?.originalDataUrl, imageState?.dimensions, backgroundImage, t]); // Use optional chaining to handle null imageState

  // Effect 2: Resize and draw to hidden canvas once dimensions are set
  useEffect(() => {
      // Run only when dimensions are set AND the hidden canvas needs drawing
      if (imageState?.dimensions && imageState?.originalDataUrl) {
          console.log("Effect 2: Dimensions available, attempting draw to hidden canvas...");
          const canvas = originalCanvasRef.current;
          const { width: drawWidth, height: drawHeight } = imageState.dimensions;

          if (canvas) {
              console.log("Effect 2: Hidden canvas ref found.");
              // Ensure canvas size matches state dimensions
              if (canvas.width !== drawWidth || canvas.height !== drawHeight) {
                  canvas.width = drawWidth;
                  canvas.height = drawHeight;
                  console.log("Effect 2: Hidden canvas resized.");
              }
              
              // Draw image to hidden canvas (reload required)
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  const imgToDraw = new Image();
                  imgToDraw.onload = () => {
                      console.log("Effect 2: Image loaded for drawing.");
                      // Fill with white first for transparency handling
                      ctx.fillStyle = "#ffffff";
                      ctx.fillRect(0, 0, drawWidth, drawHeight);
                      ctx.drawImage(imgToDraw, 0, 0, drawWidth, drawHeight);
                      console.log("Effect 2: Image drawn to hidden original canvas.");
                      // Now that drawing is complete, stop the loading indicator
                      setIsProcessing(false);
                      setProcessingStage("");
                      console.log("Effect 2 finished, processing stopped.");
                  };
                  imgToDraw.onerror = (err) => {
                      console.error("Effect 2: Failed to load image for drawing:", err);
                      setErrorMessage(t('errors.imageLoad')); // Use imageLoad error
                      setIsProcessing(false);
                      setProcessingStage("");
                  };
                  imgToDraw.src = imageState.originalDataUrl;
              } else {
                 console.error("Effect 2: Failed to get hidden canvas context.");
                 setIsProcessing(false);
                 setProcessingStage("");
              }
          } else {
             console.warn("Effect 2: Hidden canvas ref not ready yet, will retry on next render.");
             // No need to set processing false here, wait for successful draw
          }
      } else {
          // If dimensions or URL are missing, ensure processing is false
          if(isProcessing && processingStage === t('processing.loadingImage')) {
             // Only stop processing if it was specifically for loading
             // Avoids stopping if a different process is running
             console.log("Effect 2: Dimensions/URL missing, ensuring processing state is false.");
             setIsProcessing(false);
             setProcessingStage("");
          }
      }
  // Depend on dimensions. The canvas ref itself shouldn't be a dependency.
  }, [imageState?.dimensions, imageState?.originalDataUrl, isProcessing, processingStage, t]);

  // Sync activeImageId with imageState
  useEffect(() => {
    if (!activeImageId || images.length === 0) return;
    
    const activeImage = images.find(img => img.id === activeImageId);
    if (!activeImage) return;
    
    // Avoid unnecessary operations if we're already on this image
    if (imageState?.id === activeImage.id) return;
    
    console.log("Switching to image:", activeImage.id);
    
    // Reset maskDrawnRef when switching images
    maskDrawnRef.current = activeImage.maskDrawn || false;
    
    // Handle saving mask from current image before switching
    const saveMaskBeforeSwitching = async () => {
      try {
        if (drawingCanvasRef.current && imageState?.id && imageState?.maskDrawn) {
          const dataUrl = await drawingCanvasRef.current.exportImage('png');
          setImages(prevImages => prevImages.map(img => 
            img.id === imageState.id 
              ? { ...img, maskDataUrl: dataUrl, maskDrawn: true } 
              : img
          ));
        }
      } catch (error) {
        console.error("Error saving mask before switching:", error);
      }
      
      // Switch to the new image
      setImageState(activeImage);
      if (activeImage.originalDataUrl) {
        setBackgroundImage(activeImage.originalDataUrl);
      }
      
      // Signal that canvas should be cleared when switching
      setShouldClearCanvas(true);
    };
    
    saveMaskBeforeSwitching();
  }, [activeImageId, images]);
  
  // Handle canvas clearing/restoring when switching images
  useEffect(() => {
    if (!drawingCanvasRef.current || !imageState?.id) return;
    
    // Only clear canvas when shouldClearCanvas is true (image just switched)
    if (shouldClearCanvas) {
      try {
        console.log("Clearing canvas for new image");
        drawingCanvasRef.current.clearCanvas();
        setShouldClearCanvas(false);
      } catch (error) {
        console.error("Error clearing canvas:", error);
        setShouldClearCanvas(false);
      }
    }
    
    // Restore mask if this image had one stored
    if (imageState.maskDataUrl && !imageState.maskDrawn) {
      console.log("Image has stored mask, restoring it");
      setImageState(prev => prev ? {...prev, maskDrawn: true} : prev);
    }
  }, [imageState?.id, shouldClearCanvas]);

  // Update effect for images state
  useEffect(() => {
    if (images.length > 0 && !activeImageId) {
      setActiveImageId(images[0].id);
    }
  }, [images, activeImageId]);

  // Add detailed logging for imageState changes
  useEffect(() => {
    if (imageState) {
      console.log(`ImageState updated for id: ${imageState.id}`, {
        hasOriginalDataUrl: !!imageState.originalDataUrl,
        maskDrawn: imageState.maskDrawn,
        isProcessing: imageState.isProcessing
      });
      
      // Log when original image is loaded to canvas
      if (imageState.originalDataUrl && originalCanvasRef.current) {
        console.log('Loading original image to canvas');
        loadImageToCanvas(imageState.originalDataUrl, originalCanvasRef.current);
      }
      
      // Check if mask was drawn but is now reset
      if (previousMaskDrawnRef.current && !imageState.maskDrawn) {
        console.warn('Mask was drawn but is now reset to false. This may indicate an unexpected state reset.');
      }
      
      // Update previous mask state
      previousMaskDrawnRef.current = imageState.maskDrawn;
    }
  }, [imageState]);

  // Effect to redraw canvas when imageState changes
  useEffect(() => {
    console.log('imageState changed:', imageState);
    if (!imageState || !originalCanvasRef.current) return;
    
    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Check if dimensions need to be updated
    if (imageState.dimensions && 
        (canvas.width !== imageState.dimensions.width || 
         canvas.height !== imageState.dimensions.height)) {
      
      // Only update dimensions if they've changed
      console.log('Updating canvas dimensions:', imageState.dimensions);
      canvas.width = imageState.dimensions.width;
      canvas.height = imageState.dimensions.height;
      
      if (imageState.originalDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          console.log('Image redrawn on canvas after dimension change');
        };
        img.src = imageState.originalDataUrl;
      }
    }
  }, [imageState]);

  // Effect to handle immediate canvas update after processing
  useEffect(() => {
    // This ensures the canvas updates properly after processing is done
    if (!isProcessing && imageState?.originalDataUrl && originalCanvasRef.current) {
      console.log('Forced canvas redraw after processing finished');
      const canvas = originalCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Force update backgroundImage to ensure canvas reflects new image
          setBackgroundImage(imageState.originalDataUrl || "");
        };
        img.src = imageState.originalDataUrl;
      }
    }
  }, [isProcessing, imageState?.originalDataUrl]);

  // --- Handlers --- 

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileChange triggered");
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }
    
    let fileArray = Array.from(files);
    console.log(`Files selected: ${fileArray.length}`);

    // Handle Pro/Free limits
    if (!isProUser && !isProLoading) {
      if (fileArray.length > 1) {
        setErrorMessage(t('errors.freeLimit'));
        fileArray = [fileArray[0]]; // Keep only the first file for free users
      }
    } else {
      // For PRO users, limit to 100 images
      if (fileArray.length > 100) {
        setErrorMessage(t('errors.tooManyImages'));
        fileArray = fileArray.slice(0, 100);
      }
    }

    const newImageObjects: ProcessingImageState[] = [];
    const fileReaders: Promise<void>[] = [];

    for (const file of fileArray) { // Iterate through all selected files
        if (!file.type.startsWith('image/')) { // Basic type check
             console.warn(`Skipping non-image file: ${file.name}`);
             continue;
        }

        const newImageId = crypto.randomUUID();
        const newImageState: ProcessingImageState = {
            id: newImageId,
            file: file,
            originalDataUrl: null,
            processedDataUrl: null,
            dimensions: null,
            maskDrawn: false,
            isSelected: false, // Don't select by default when adding
            isProcessing: true, // Mark as loading
            processingStage: t('processing.readingFile'), // New translation key
            errorMessage: null,
            maskDataUrl: null, // Initialize maskDataUrl
        };
        newImageObjects.push(newImageState);

        // Create a promise for each file reader
        fileReaders.push(new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (!dataUrl) {
                    console.error("FileReader result is null for ID:", newImageId);
                    // CORRECTED: Update the specific image with an error using setImages
                    setImages(prev => prev.map(img => 
                        img.id === newImageId 
                            ? {...img, isProcessing: false, processingStage: "", errorMessage: t('errors.fileRead')} 
                            : img
                    ));
                    reject(new Error('File read error')); // Reject the promise
                } else {
                     console.log("FileReader onload event - Setting originalDataUrl for ID:", newImageId);
                     // CORRECTED: Update the specific image's dataUrl using setImages
                     setImages(prev => prev.map(img => 
                        img.id === newImageId 
                            ? {...img, originalDataUrl: dataUrl } // isProcessing remains true until Effect 1 finishes
                            : img
                    ));
                    resolve(); // Resolve the promise on success
                }
            };
            reader.onerror = (err) => {
                console.error("FileReader error for ID:", newImageId, err);
                 // CORRECTED: Update the specific image with an error using setImages
                setImages(prev => prev.map(img => 
                    img.id === newImageId 
                        ? {...img, isProcessing: false, processingStage: "", errorMessage: t('errors.fileRead')} 
                        : img
                ));
                reject(err); // Reject the promise on error
            };
            reader.readAsDataURL(file);
        }));
    } // End of file loop

    // Add the new image objects to the state by appending
    if (newImageObjects.length > 0) {
        setImages(prevImages => [...prevImages, ...newImageObjects]);
        // If no image was active before (queue was empty), make the first new one active
        if (activeImageId === null) {
             setActiveImageId(newImageObjects[0].id);
             console.log("Setting first uploaded image as active:", newImageObjects[0].id);
        }
        console.log(`Appended ${newImageObjects.length} new images to the queue.`);
    }
   
    // --- Wait for all readers to complete (or fail) --- (Optional logging)
    try {
        await Promise.all(fileReaders);
        console.log("All file read attempts finished for this batch.");
    } catch (error) { 
        console.error("Error during file reading process for this batch:", error);
    }
    
    // Clear the input value to allow re-selecting the same file(s)
    e.target.value = ""; 
  };

  const handleSelectImage = (imageId: string) => {
    if (imageId !== activeImageId) {
      setActiveImageId(imageId);
    }
  };

  const handleRemoveObjects = async () => {
    // --- Prerequisites Check --- 
    console.log("handleRemoveObjects triggered");
    console.log("Checking refs and state:", { 
        originalCanvasRef: originalCanvasRef.current, 
        drawingCanvasRef: drawingCanvasRef.current,
        originalDataUrl: imageState.originalDataUrl,
        maskDrawn: imageState.maskDrawn,
        session: session,
        ort: ort
    });
    
    // Perform ALL checks *before* changing state
    if (!imageState.originalDataUrl || 
        !drawingCanvasRef.current || 
        !originalCanvasRef.current || 
        !session || 
        !ort)
    {
        const missing = [];
        if (!imageState.originalDataUrl) missing.push("Image data");
        if (!drawingCanvasRef.current) missing.push("Drawing canvas ref");
        if (!originalCanvasRef.current) missing.push("Original canvas ref");
        if (!session) missing.push("Model session");
        if (!ort) missing.push("ORT instance");
        console.error("Cannot process, missing:", missing.join(', '));
        setErrorMessage(t('errors.prerequisites', { missing: missing.join(', ') }));
        return;
    }
    if (!imageState.maskDrawn) {
        console.error("Cannot process, mask not drawn.")
        setErrorMessage(t('errors.noMask'));
        return;
    }

    // --- Start Processing (Now that checks passed) --- 
    console.log("Prerequisites met, starting processing...");
    setIsProcessing(true);
    setProcessingStage(t('processing.exportingMask'));
    setErrorMessage(null);
    
    // Use local variable for the ref that passed the check
    const validOriginalCanvas = originalCanvasRef.current;

    try {
      // 1. Export mask drawing from ReactSketchCanvas
      let maskDataUrl: string;
      try {
        maskDataUrl = await drawingCanvasRef.current.exportImage('png');
        // Store mask for current image
        setImages(prevImages => prevImages.map(img => 
          img.id === imageState.id 
            ? { ...img, maskDataUrl: maskDataUrl, maskDrawn: true } 
            : img
        ));
      } catch (error) {
        console.error("Error exporting mask from canvas:", error);
        // If there's an error with the sketch canvas, try using the stored mask if available
        if (imageState.maskDataUrl) {
          console.log("Using stored mask instead of canvas export");
          maskDataUrl = imageState.maskDataUrl;
        } else {
          throw new Error("Failed to export mask from canvas and no stored mask available.");
        }
      }
      
      if (!maskDataUrl) {
          throw new Error("Failed to export mask from canvas.");
      }
      
      // 2. Load mask data URL into an Image element for processing function
      const maskImage = new Image();
      maskImage.src = maskDataUrl;
      await new Promise((resolve, reject) => {
          maskImage.onload = resolve;
          maskImage.onerror = (err) => reject(new Error(`Failed to load mask image: ${err}`));
      });
      console.log("Mask image loaded from data URL");
      
      // Apply to a single image or multiple
      if (applyMaskToAll && images.length > 1) {
        // --- Batch processing for all images ---
        setProcessingStage(t('processing.preparingBatch'));
        
        // First, make sure all images have their dimensions loaded
        const imagesToProcess = [...images];
        let allImagesReady = true;
        
        // Check if all images have dimensions
        for (const img of imagesToProcess) {
          if (img.originalDataUrl && !img.dimensions) {
            allImagesReady = false;
            break;
          }
        }
        
        // If not all images are ready, load dimensions for all
        if (!allImagesReady) {
          setProcessingStage(t('processing.loadingDimensions'));
          
          // Load dimensions for all images in parallel
          const loadImagePromises = imagesToProcess.map(img => {
            if (img.originalDataUrl && !img.dimensions) {
              return new Promise<ProcessingImageState>((resolve) => {
                const imgElement = new Image();
                imgElement.onload = () => {
                  const maxDim = 512;
                  let drawWidth = imgElement.width;
                  let drawHeight = imgElement.height;
                  const aspectRatio = imgElement.width / imgElement.height;
                  
                  if (drawWidth > maxDim || drawHeight > maxDim) {
                    if (aspectRatio >= 1) {
                      drawWidth = maxDim;
                      drawHeight = Math.round(maxDim / aspectRatio);
                    } else {
                      drawHeight = maxDim;
                      drawWidth = Math.round(maxDim * aspectRatio);
                    }
                  }
                  
                  resolve({
                    ...img,
                    dimensions: { width: drawWidth, height: drawHeight }
                  });
                };
                imgElement.onerror = () => {
                  // On error, resolve with original
                  resolve(img);
                };
                // Ensure we don't pass null to img.src (TypeScript safety)
                if (img.originalDataUrl) {
                  imgElement.src = img.originalDataUrl;
                }
              });
            }
            return Promise.resolve(img);
          });
          
          // Update all images with dimensions
          const updatedImages = await Promise.all(loadImagePromises);
          setImages(updatedImages);
          
          // Process all images in sequence
          const processedImages = [...updatedImages];
          
          // Process all images with dimensions
          for (let i = 0; i < processedImages.length; i++) {
            const image = processedImages[i];
            setProcessingProgress(Math.round((i / processedImages.length) * 100));
            
            if (!image.originalDataUrl || !image.dimensions) {
              console.warn(`Skipping image ${image.id} - missing data`);
              continue;
            }
            
            setProcessingStage(t('processing.processingImage', { current: i+1, total: processedImages.length }));
            
            // Create a temporary canvas to draw this image
            const tempCanvas = document.createElement('canvas');
            const { width, height } = image.dimensions;
            tempCanvas.width = width;
            tempCanvas.height = height;
            
            // Draw the image on the temp canvas
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) {
              console.warn(`Skipping image ${image.id} - can't get 2D context`);
              continue;
            }
            
            const img = new Image();
            if (image.originalDataUrl) {
              img.src = image.originalDataUrl;
              await new Promise(resolve => {
                img.onload = resolve;
              });
              
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              
              // Process this image with the mask
              try {
                const resultDataUrl = await processImageWithObjectRemoval(
                  ort,
                  session as unknown as SessionAPI,
                  tempCanvas,
                  maskImage
                );
                
                processedImages[i] = {
                  ...image,
                  originalDataUrl: resultDataUrl,
                  processedDataUrl: resultDataUrl,
                  maskDrawn: false,
                  maskDataUrl: null // Clear the mask since it's been applied
                };
              } catch (error) {
                console.error(`Error processing image ${image.id}:`, error);
                // Continue with the next image
              }
            }
          }
          
          setProcessingProgress(100);
          setProcessingStage(t('processing.finishingBatch'));
          setImages(processedImages);
          
          // Update active image state
          const updatedActiveImage = processedImages.find(img => img.id === activeImageId);
          if (updatedActiveImage) {
            setImageState(updatedActiveImage);
            setBackgroundImage(updatedActiveImage.originalDataUrl || "");
          }
        } else {
          // All images already have dimensions
          const processedImages = [...imagesToProcess];
          
          // Process all images with dimensions
          for (let i = 0; i < processedImages.length; i++) {
            const image = processedImages[i];
            setProcessingProgress(Math.round((i / processedImages.length) * 100));
            
            if (!image.originalDataUrl || !image.dimensions) {
              console.warn(`Skipping image ${image.id} - missing data`);
              continue;
            }
            
            setProcessingStage(t('processing.processingImage', { current: i+1, total: processedImages.length }));
            
            // Create a temporary canvas to draw this image
            const tempCanvas = document.createElement('canvas');
            const { width, height } = image.dimensions;
            tempCanvas.width = width;
            tempCanvas.height = height;
            
            // Draw the image on the temp canvas
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) {
              console.warn(`Skipping image ${image.id} - can't get 2D context`);
              continue;
            }
            
            const img = new Image();
            if (image.originalDataUrl) {
              img.src = image.originalDataUrl;
              await new Promise(resolve => {
                img.onload = resolve;
              });
              
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              
              // Process this image with the mask
              try {
                const resultDataUrl = await processImageWithObjectRemoval(
                  ort,
                  session as unknown as SessionAPI,
                  tempCanvas,
                  maskImage
                );
                
                processedImages[i] = {
                  ...image,
                  originalDataUrl: resultDataUrl,
                  processedDataUrl: resultDataUrl,
                  maskDrawn: false,
                  maskDataUrl: null // Clear the mask since it's been applied
                };
              } catch (error) {
                console.error(`Error processing image ${image.id}:`, error);
                // Continue with the next image
              }
            }
          }
          
          setProcessingProgress(100);
          setProcessingStage(t('processing.finishingBatch'));
          setImages(processedImages);
          
          // Update active image state
          const updatedActiveImage = processedImages.find(img => img.id === activeImageId);
          if (updatedActiveImage) {
            setImageState(updatedActiveImage);
            setBackgroundImage(updatedActiveImage.originalDataUrl || "");
          }
        }
      } else {
        // --- Single image processing (original logic) ---
        setProcessingStage(t('processing.runningModel'));
        const resultDataUrl = await processImageWithObjectRemoval(
          ort,
          session as unknown as SessionAPI, 
          validOriginalCanvas,
          maskImage 
        );
        console.log("Object removal processing complete, received result URL.");

        // Update single image state
        setProcessingStage(t('processing.rendering'));
        
        // Update active image state
        setImageState(prevState => ({
          ...prevState,
          originalDataUrl: resultDataUrl,
          processedDataUrl: resultDataUrl,
          maskDrawn: false,
          maskDataUrl: null // Clear mask since it's been applied
        }));
        
        // Update the image in the images array
        setImages(prevImages => prevImages.map(img => 
          img.id === activeImageId
            ? {
                ...img,
                originalDataUrl: resultDataUrl,
                processedDataUrl: resultDataUrl,
                maskDrawn: false,
                maskDataUrl: null // Clear mask since it's been applied
              }
            : img
        ));
        
        // Force immediate update to background image to show result
        setBackgroundImage(resultDataUrl);
        
        // Reset mask drawn state for next drawing
        maskDrawnRef.current = false;
      }
      
      // Clear the mask regardless of single/batch mode
      try {
        if (drawingCanvasRef.current) {
          drawingCanvasRef.current.clearCanvas();
        }
      } catch (error) {
        console.error("Error clearing canvas in handleRemoveObjects:", error);
      }
      
      console.log("State updated, result is new source, background updated, mask cleared.");
      
      // Ensure the UI has a chance to update before removing the processing state
      // This will make sure users see the new image before the loader disappears
      setTimeout(() => {
        setProcessingStage("");
        setIsProcessing(false);
        setProcessingProgress(0);
      }, 500); // Short delay to ensure UI updates

    } catch (error) {
        console.error('Object removal failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`${t('errors.processingFailed')}: ${errorMsg}`);
        // Ensure processing stops on error
        setIsProcessing(false); 
        setProcessingStage("");
        setProcessingProgress(0);
    }
  };

  const clearMask = useCallback(() => {
    console.log('clearMask called with activeImageId:', activeImageId);
    if (!activeImageId || !originalCanvasRef.current) return;
    
    // Reset maskDrawnRef when clearing the mask
    maskDrawnRef.current = false;
    
    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    console.log('Clearing mask on canvas');
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the original image
    if (imageState?.originalDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        console.log('Original image redrawn after clearing mask');
      };
      img.src = imageState.originalDataUrl;
    }
    
    // Try to clear the drawing canvas
    try {
      if (drawingCanvasRef.current) {
        drawingCanvasRef.current.clearCanvas();
      }
    } catch (error) {
      console.error("Error clearing drawing canvas:", error);
    }
    
    // Update state to reflect mask is no longer drawn
    setImages(prevImages => {
      const updatedImages = prevImages.map(img => {
        if (img.id === activeImageId) {
          console.log('Setting maskDrawn to false for image:', img.id);
          return { ...img, maskDrawn: false };
        }
        return img;
      });
      return updatedImages;
    });
    
    setImageState(prev => {
      if (prev) {
        console.log('Updating imageState maskDrawn to false');
        return { ...prev, maskDrawn: false };
      }
      return prev;
    });
  }, [activeImageId, imageState, originalCanvasRef]);

  // Effect to handle changes in activeImageId
  useEffect(() => {
    console.log('activeImageId changed to:', activeImageId);
    if (!activeImageId) {
      // Initialize with default empty object instead of null
      setImageState({
        id: "",
        file: null,
        originalDataUrl: null,
        processedDataUrl: null,
        dimensions: null,
        maskDrawn: false,
        isSelected: false,
        isProcessing: false,
        processingStage: "",
        errorMessage: null,
      });
      return;
    }

    const activeImage = images.find(img => img.id === activeImageId);
    console.log('Found active image:', activeImage);
    if (activeImage) {
      setImageState(activeImage);
    }
  }, [activeImageId, images]);

  const handleDownload = () => {
    // If multiple images and at least one is processed
    if (images.length > 1 && images.some(img => img.processedDataUrl)) {
      downloadBatchImages();
    } else {
      // Download single image (original logic)
      const sourceFilename = imageState.file?.name || 'image';
      
      if (!imageState.processedDataUrl) {
          console.error("Download failed: No processed image data available.");
          setErrorMessage(t('errors.noDownloadData'));
          return;
      }

      try {
          const link = document.createElement('a');
          link.href = imageState.processedDataUrl;
          
          const nameWithoutExtension = sourceFilename.replace(/\.[^/.]+$/, "");
          link.download = `${nameWithoutExtension}-inpainted.png`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log("Download initiated for:", link.download);
      } catch (error) {
          console.error("Error initiating download:", error);
          setErrorMessage(t('errors.downloadFailed'));
      }
    }
  };
  
  const downloadBatchImages = async () => {
    try {
      setIsProcessing(true);
      setProcessingStage(t('processing.preparingDownload'));
      
      // Use JSZip if available, otherwise show error
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      images.forEach((image, index) => {
        if (image.processedDataUrl) {
          // Extract base64 data from data URL
          const base64Data = image.processedDataUrl.split(",")[1];
          
          // Get filename
          const sourceFilename = image.file?.name || `image-${index + 1}.png`;
          const nameWithoutExtension = sourceFilename.replace(/\.[^/.]+$/, "");
          const filename = `${nameWithoutExtension}-inpainted.png`;
          
          // Add to zip
          zip.file(filename, base64Data, { base64: true });
        }
      });
      
      // Generate zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = "object-removal-batch.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsProcessing(false);
      setProcessingStage("");
      
    } catch (error) {
      console.error("Error creating ZIP file:", error);
      setErrorMessage(t('errors.downloadFailed'));
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const handleClearAll = () => {
    // Reset everything
    setImages([]);
    setActiveImageId(null);
    setImageState({
      id: "",
      file: null,
      originalDataUrl: null,
      processedDataUrl: null,
      dimensions: null,
      maskDrawn: false,
      isSelected: false,
      isProcessing: true,
      processingStage: t('processing.readingFile'),
      errorMessage: null,
    });
    setBackgroundImage("");
    clearMask();
    setErrorMessage(null);
    setProcessingStage("");
    setIsProcessing(false);
    setProcessingProgress(0);
  };

  // --- Render --- 

  // Check if an image is loaded based on the new state
  const isImageLoaded = !!imageState.originalDataUrl;
  const hasMultipleImages = images.length > 1;
  
  // Define isLoading based on required states
  const isLoading = !isOrtLoaded || !isOpenCVReady || isProLoading || (isOrtLoaded && !session);

  // Helper function to load image to canvas
  const loadImageToCanvas = (dataUrl: string, canvas: HTMLCanvasElement) => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };
    img.src = dataUrl;
  };

  // Modify the ReactSketchCanvas component with proper key and error handling
  // This ensures it unmounts and remounts properly when the active image changes
  const CanvasComponent = useMemo(() => {
    if (!imageState?.dimensions) return null;
    
    return (
      <ReactSketchCanvas
        key={imageState.id} // Add a key to ensure proper remounting only when image changes
        ref={drawingCanvasRef}
        strokeWidth={brushSize}
        strokeColor={brushColor}
        canvasColor="transparent"
        width={`${imageState.dimensions.width}px`}
        height={`${imageState.dimensions.height}px`}
        backgroundImage={backgroundImage || ""}
        preserveBackgroundImageAspectRatio="none"
        className="relative z-10 block"
        onStroke={() => {
          // Only update state if this is the first stroke
          if (!maskDrawnRef.current && activeImageId) {
            console.log('First stroke - updating mask drawn state');
            maskDrawnRef.current = true;
            
            // Use requestAnimationFrame to defer state updates until after rendering
            // This prevents flickering during drawing
            requestAnimationFrame(() => {
              // Update images state
              setImages(prevImages => {
                const updatedImages = prevImages.map(img => {
                  if (img.id === activeImageId && !img.maskDrawn) {
                    console.log('Setting maskDrawn to true for image:', img.id);
                    return { ...img, maskDrawn: true };
                  }
                  return img;
                });
                return updatedImages;
              });
              
              // Update imageState
              setImageState(prev => {
                if (prev && !prev.maskDrawn) {
                  console.log('Updating imageState maskDrawn to true');
                  return { ...prev, maskDrawn: true };
                }
                return prev;
              });
            });
          }
        }}
        exportWithBackgroundImage={false}
      />
    );
  // Only depend on properties that should cause a canvas remount
  }, [imageState?.id, imageState?.dimensions, brushSize, brushColor, backgroundImage, activeImageId]);

  // Modified Canvas Display Area section with improved loading indicator
  const canvasDisplaySection = useMemo(() => {
    if (!isImageLoaded || !imageState?.dimensions) {
      return null;
    }
    
    return (
      <div className="space-y-4 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium mb-2">{t('mainCard.canvas.drawTitle')}</p> 
          <div 
            className="overflow-hidden relative shadow-brutalist bg-white p-1" 
            style={{ 
              width: (imageState.dimensions.width + 2), 
              height: (imageState.dimensions.height + 2) 
            }}
          >
            {/* Hidden Original Canvas - Used as source for processing */}
            <canvas 
              ref={originalCanvasRef} 
              style={{ display: 'none' }} 
              width={imageState.dimensions.width} 
              height={imageState.dimensions.height} 
            />
            {/* Drawing Canvas (Visible) */}
            {CanvasComponent}
            
            {/* Loading Overlay - Visible during processing */}
            {isProcessing && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white bg-opacity-80"
              >
                <Loader size="md" className="mb-2" />
                <p className="text-center text-sm font-medium">
                  {processingStage || t('processing.generic')}
                </p>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between w-full max-w-sm space-x-2 px-1">
            <div className='flex items-center space-x-2'>
              <label className="block text-xs text-gray-600 whitespace-nowrap">
                {t('mainCard.canvas.brushSize')}
              </label>
              <input
                type="range"
                min="5"
                max="70"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 h-4 brutalist-border bg-white appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                disabled={isProcessing}
              />
              <span className="text-xs w-4 text-right">{brushSize}</span>
            </div>
            <Button
              variant='default'
              size='sm'
              onClick={clearMask}
              disabled={isProcessing || !imageState.maskDrawn}
              className="text-xs !px-2 !py-1 shadow-brutalist-sm"
            >
              {t('mainCard.canvas.clearMask')}
            </Button>
          </div>
        </div>

        {/* Action Buttons */} 
        <div className="brutalist-border bg-white p-4 mt-4">
          <div className="flex flex-wrap justify-center items-center gap-4">
            <div className="relative flex items-center">
              <Button
                variant="accent"
                onClick={handleRemoveObjects}
                disabled={isProcessing || !imageState.maskDrawn || !session}
                className="flex items-center gap-2"
              >
                {isProcessing && <Loader size="sm" className="w-5 h-5"/>}
                {isProcessing 
                  ? t('mainCard.actions.processing') 
                  : hasMultipleImages && applyMaskToAll 
                    ? t('mainCard.actions.removeAllObjects') 
                    : t('mainCard.actions.remove')
                }
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={handleDownload}
              disabled={isProcessing || (!imageState.processedDataUrl && !images.some(img => img.processedDataUrl))}
            >
              {hasMultipleImages && images.some(img => img.processedDataUrl) 
                ? t('mainCard.actions.downloadAll') 
                : t('mainCard.actions.download')
              }
            </Button>
          </div>
          
          {/* Progress bar for batch processing */}
          {isProcessing && hasMultipleImages && (
            <div className="mt-4 space-y-2">
              <div className="w-full h-3 brutalist-border bg-white overflow-hidden">
                <div 
                  className="h-full bg-[#4F46E5]"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs">
                <span>{t('processing.batchProgress')}</span>
                <span>{processingProgress}%</span>
              </div>
            </div>
          )}
          
          {processingStage && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200">
              <p className='text-center text-sm font-medium'>{processingStage}</p>
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200">
              <p className="text-red-500 text-center text-sm">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    isImageLoaded, 
    imageState?.dimensions, 
    imageState?.maskDrawn, 
    imageState?.processedDataUrl,
    brushSize, 
    isProcessing, 
    processingStage, 
    processingProgress,
    errorMessage,
    hasMultipleImages,
    applyMaskToAll,
    session,
    CanvasComponent,
    t
  ]);

  return (
    <>
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="brutalist-accent-card mb-8">
          <h1 className="text-3xl font-bold text-center uppercase mb-6">
             {t('title')}
          </h1>

          {isLoading ? (
            <div className="brutalist-border p-4 text-center mb-6 bg-white">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader size="lg" />
                <h3 className="text-lg font-bold mb-2">
                  {!isOrtLoaded ? t('loading.ort') :
                   !isOpenCVReady ? t('loading.opencv') :
                   !session ? t('loading.model') :
                   isProLoading ? t('loading.proStatus') :
                   t('loading.generic')}
                </h3>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Processing Area (Left/Center) */}
              <div className="md:col-span-2">
                <Card
                  title={t('mainCard.title')}
                  variant="accent"
                  headerRight={
                    isProUser ? <ProBadge className="ml-2" /> : null
                  }
                >
                   <div className="space-y-6">
                    {/* Info Section */}
                     <div className="brutalist-border p-4 bg-white">
                       <h3 className="font-bold mb-2">{t('mainCard.info.title')}</h3>
                       <p className="text-sm mb-2">
                         {t('mainCard.info.description')}
                       </p>
                        {!isProUser && (
                            <div className="bg-yellow-50 p-3 mb-2 brutalist-border">
                            <p className="text-sm font-bold flex items-center">
                                {t('mainCard.info.freeMode.title')}
                            </p>
                            <p className="text-xs">
                                {t('mainCard.info.freeMode.description')}
                            </p>
                            </div>
                        )}
                        {isProUser && (
                            <div className="bg-yellow-50 p-3 mb-2 brutalist-border">
                            <p className="text-sm font-bold flex items-center">
                                {t('mainCard.info.proMode.title')} <ProBadge className="ml-2" />
                            </p>
                            <p className="text-xs">
                                {t('mainCard.info.proMode.description')}
                            </p>
                            </div>
                        )}
                     </div>

                     {/* Upload Area */}
                     {images.length === 0 && (
                       <div className="brutalist-border p-6 bg-white text-center">
                         <p className="text-lg font-bold mb-4">{t('mainCard.upload.title')}</p>
                         <input
                           type="file"
                           accept="image/*"
                           multiple={isProUser}
                           onChange={handleFileChange}
                           className="hidden"
                           id="fileInputObjRemove"
                           disabled={isProcessing}
                         />
                         <label htmlFor="fileInputObjRemove" className="inline-block">
                           <Button as="span" variant="primary" size="lg" disabled={isProcessing}>
                              {t('mainCard.upload.button')}
                           </Button>
                         </label>
                         <p className="text-xs text-gray-600 mt-2">
                           {isProUser ? t('mainCard.upload.helpTextPro') : t('mainCard.upload.helpTextFree')}
                         </p>
                       </div>
                     )}

                     {/* Image Gallery for Multi-Image (Pro users) */}
                     {images.length > 0 && (
                       <div className="brutalist-border p-4 bg-white mb-4">
                         <div className="flex justify-between mb-3">
                           <h3 className="font-medium text-sm">
                             {hasMultipleImages 
                               ? `${t('imageGallery.selectedImages')} (${images.length})` 
                               : t('imageGallery.selectedImage')}
                           </h3>
                           <button 
                             onClick={handleClearAll} 
                             className="text-xs text-red-600 hover:underline"
                             disabled={isProcessing}
                           >
                             {t('imageGallery.clearAll')}
                           </button>
                         </div>
                         
                         {hasMultipleImages && (
                           <div className="grid grid-cols-6 gap-2 mb-3 max-h-40 overflow-y-auto p-1">
                             {images.map(image => (
                               <div 
                                 key={image.id} 
                                 className={`relative cursor-pointer border-2 overflow-hidden ${activeImageId === image.id ? 'border-blue-500' : 'border-transparent'} ${image.maskDrawn ? 'bg-red-50' : ''}`}
                                 onClick={() => handleSelectImage(image.id)}
                               >
                                 {image.originalDataUrl && (
                                   <div style={{ width: '100%', paddingBottom: '100%', position: 'relative' }}>
                                     <img 
                                       src={image.originalDataUrl} 
                                       alt={image.file?.name || 'Image'}
                                       className="absolute inset-0 w-full h-full object-cover"
                                     />
                                     {image.maskDrawn && (
                                       <div className="absolute top-0 right-0 bg-red-500 rounded-full w-3 h-3 m-1" 
                                            title={t('imageGallery.hasMask')}></div>
                                     )}
                                   </div>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}
                         
                         {isProUser && hasMultipleImages && (
                           <div className="flex items-center mb-2">
                             <input
                               type="checkbox"
                               id="applyMaskToAll"
                               checked={applyMaskToAll}
                               onChange={(e) => setApplyMaskToAll(e.target.checked)}
                               className="mr-2 h-4 w-4 brutalist-border"
                               disabled={isProcessing}
                             />
                             <label htmlFor="applyMaskToAll" className="text-sm">
                               {t('imageGallery.applyMaskToAll')}
                             </label>
                           </div>
                         )}
                       </div>
                     )}

                     {/* Canvas Display Area */}
                     {canvasDisplaySection}
                   </div>
                </Card>
              </div>

              {/* Sidebar Area (Right) */}
              <div className="space-y-6">
                 {/* Pro Upgrade Card */} 
                 {!isProUser && (
                     <Card title={t('upgradeCard.title')} variant="accent">
                         {/* Simplified: Link to pricing page */}
                         <p className="text-sm mb-4">{t('upgradeCard.description')}</p>
                         <Button variant='primary' onClick={() => router.push('/pricing')} fullWidth>
                             {t('upgradeCard.button')}
                         </Button>
                     </Card>
                 )}

                 {/* Instructions Card */}
                 <Card title={t('instructionsCard.title')} variant="accent">
                    <div className="space-y-2 text-sm p-3 bg-white brutalist-border">
                       <p>1. {t('instructionsCard.step1')}</p>
                       <p>2. {t('instructionsCard.step2')}</p>
                       <p>3. {t('instructionsCard.step3')}</p>
                       <p>4. {t('instructionsCard.step4')}</p>
                       <p>5. {t('instructionsCard.step5')}</p>
                       {isProUser && (
                         <p>6. {t('instructionsCard.step6')}</p>
                       )}
                       <p className='mt-2 text-xs'><strong>{t('instructionsCard.noteTitle')}</strong> {t('instructionsCard.noteText')}</p>
                    </div>
                 </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 