'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // Canvas refs
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  // const outputCanvasRef = useRef<HTMLCanvasElement>(null); // REMOVE
  const drawingCanvasRef = useRef<ReactSketchCanvasRef>(null); // Main interaction canvas

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
    if (imageState.originalDataUrl && !imageState.dimensions) {
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
    } else if (!imageState.originalDataUrl) {
        // Clean up background if URL is removed (reset)
         if (backgroundImage !== "") {
              console.log("Effect 1: Cleaning up background image due to null URL");
              setBackgroundImage("");
         }
    }
  }, [imageState.originalDataUrl, imageState.dimensions, backgroundImage, t]); // Add backgroundImage to deps

  // Effect 2: Resize and draw to hidden canvas once dimensions are set
  useEffect(() => {
      // Run only when dimensions are set AND the hidden canvas needs drawing
      if (imageState.dimensions && imageState.originalDataUrl) {
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
  }, [imageState.dimensions, imageState.originalDataUrl, isProcessing, processingStage, t]); 

  // Sync activeImageId with imageState
  useEffect(() => {
    if (activeImageId && images.length > 0) {
      const activeImage = images.find(img => img.id === activeImageId);
      if (activeImage) {
        setImageState(activeImage);
      }
    }
  }, [activeImageId, images]);

  // --- Handlers --- 

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileChange triggered");
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected");
      return;
    }
    console.log(`Files selected: ${files.length}`);

    // --- TODO: Add Free/Pro limit checks here (e.g., max total images) ---

    const newImageObjects: ProcessingImageState[] = [];
    const fileReaders: Promise<void>[] = [];

    for (const file of Array.from(files)) { // Iterate through all selected files
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
    setImageState(prevState => ({ ...prevState, processedDataUrl: null })); // Clear previous output URL state *after* checks

    // Use local variable for the ref that passed the check
    const validOriginalCanvas = originalCanvasRef.current;

    try {
      // 1. Export mask drawing from ReactSketchCanvas
      const maskDataUrl = await drawingCanvasRef.current.exportImage('png');
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

      // 3. Call the processing utility function
      setProcessingStage(t('processing.runningModel'));
      const resultDataUrl = await processImageWithObjectRemoval(
          ort,
          session as unknown as SessionAPI, 
          validOriginalCanvas, // Use the validated canvas element
          maskImage 
      );
      console.log("Object removal processing complete, received result URL.");

      // 4. Update state: Make the result the new source image
      setProcessingStage(t('processing.rendering'));

      // Update state directly. Effect 2 will handle redrawing the hidden canvas.
      setImageState(prevState => ({
          ...prevState,
          originalDataUrl: resultDataUrl, // Treat the result as the new original
          processedDataUrl: resultDataUrl, // Keep track of the latest result
          maskDrawn: false 
      }));
      setBackgroundImage(resultDataUrl); // Update visible canvas background
      clearMask(); // Clear the mask drawn on the previous step
      
      console.log("State updated, result is new source, background updated, mask cleared.");
      setProcessingStage("");
      setIsProcessing(false); // Stop processing indicator

    } catch (error) {
        console.error('Object removal failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(`${t('errors.processingFailed')}: ${errorMsg}`);
        // Ensure processing stops on error caught before image loading starts
        if (isProcessing) setIsProcessing(false); 
        if (processingStage) setProcessingStage("");
    }
  };

  const handleMaskDraw = useCallback(() => {
      setImageState({
          ...imageState,
          maskDrawn: true,
      });
  }, [imageState]);

  const clearMask = () => {
    if (drawingCanvasRef.current) {
      drawingCanvasRef.current.clearCanvas();
      setImageState({
          ...imageState,
          maskDrawn: false,
      });
    }
  };

  const handleDownload = () => {
    // Download based on processedDataUrl state, not canvas ref
    const sourceFilename = imageState.file?.name || 'image';
    
    if (!imageState.processedDataUrl) {
        console.error("Download failed: No processed image data available.");
        setErrorMessage(t('errors.noDownloadData'));
        return;
    }

    try {
        const link = document.createElement('a');
        link.href = imageState.processedDataUrl; // Use the state URL
        
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
  };

  // --- Render --- 

  // Check if an image is loaded based on the new state
  const isImageLoaded = !!imageState.originalDataUrl;
  
  // Define isLoading based on required states
  const isLoading = !isOrtLoaded || !isOpenCVReady || isProLoading || (isOrtLoaded && !session);

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
                     {!isImageLoaded && (
                       <div className="brutalist-border p-6 bg-white text-center">
                         <p className="text-lg font-bold mb-4">{t('mainCard.upload.title')}</p>
                         <input
                           type="file"
                           accept="image/*"
                           // multiple={isProUser} // Enable later for multi-image
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

                     {/* Canvas Display Area */}
                     {isImageLoaded && imageState.dimensions && (
                        <div className="space-y-4 flex flex-col items-center"> {/* Center the single canvas area */} 
                          {/* Remove lg:flex-row justify-around */}
                          {/* <div className="flex flex-col lg:flex-row justify-around items-center lg:items-start gap-6 w-full"> */} 
                              {/* Drawing Canvas Section (Now the main view) */} 
                              <div className="flex flex-col items-center">
                                {/* Combine titles maybe? Or adjust wording */} 
                                <p className="text-sm font-medium mb-2">{t('mainCard.canvas.drawTitle')}</p> 
                                <div className="overflow-hidden relative shadow-brutalist bg-white p-1" style={{ width: imageState.dimensions.width + 2, height: imageState.dimensions.height + 2 }}>
                                   {/* Hidden Original Canvas - Used as source for processing */}
                                   <canvas 
                                      ref={originalCanvasRef} 
                                      style={{ display: 'none' }} 
                                      width={imageState.dimensions.width} 
                                      height={imageState.dimensions.height} 
                                   />
                                   {/* Drawing Canvas (Visible) */} 
                                   <ReactSketchCanvas
                                      ref={drawingCanvasRef}
                                      strokeWidth={brushSize}
                                      strokeColor={brushColor}
                                      canvasColor="transparent"
                                      width={imageState.dimensions.width + "px"}
                                      height={imageState.dimensions.height + "px"}
                                      backgroundImage={backgroundImage} // This now changes
                                      preserveBackgroundImageAspectRatio="contain"
                                      className="relative z-10 block"
                                      onStroke={handleMaskDraw}
                                   />
                                </div>
                                <div className="mt-2 flex items-center justify-between w-full max-w-sm space-x-2 px-1">
                                  <div className='flex items-center space-x-2'>
                                    <label className="block text-xs text-gray-600 whitespace-nowrap">{t('mainCard.canvas.brushSize')}</label>
                                    <input
                                      type="range"
                                      min="5"
                                      max="70" // Increased max size
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

                              {/* REMOVE Processed Image Output Section */} 
                              {/* 
                              <div className="flex flex-col items-center">
                                  <p>{t('mainCard.canvas.outputTitle')}</p>
                                  <div style={{ width: imageState.dimensions.width + 2, height: imageState.dimensions.height + 2 }}>
                                      <canvas ref={outputCanvasRef} ... />
                                      {!imageState.processedDataUrl && ( ... placeholder ... )}
                                  </div>
                              </div>
                              */}
                          {/* </div> */} 

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
                                          {isProcessing ? t('mainCard.actions.processing') : t('mainCard.actions.remove')}
                                      </Button>
                                  </div>
                                  <Button
                                      variant="primary"
                                      onClick={handleDownload}
                                      disabled={isProcessing || !imageState.processedDataUrl}
                                  >
                                      {t('mainCard.actions.download')}
                                  </Button>
                              </div>
                              {isProcessing && processingStage && (
                                  <p className='text-center text-sm mt-3'>{processingStage}</p>
                              )}
                              {errorMessage && (
                                  <p className="text-red-500 text-center text-sm mt-3">{errorMessage}</p>
                              )}
                          </div>
                        </div>
                     )}
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
                       <p className='mt-2 text-xs'><strong>{t('instructionsCard.noteTitle')}</strong> {t('instructionsCard.noteText')}</p>
                    </div>
                 </Card>
              </div>
            </div>
          )}
        </div>
         {/* TODO: Add Pro Upgrade Dialog for specific actions if needed */}
      </main>
    </>
  );
} 