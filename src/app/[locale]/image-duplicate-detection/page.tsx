"use client";

import { useEffect, useState, useRef, ChangeEvent } from 'react';
import NextImage from 'next/image'; // Aliased import
import Button from '../../components/Button';
import Card from '../../components/Card';
import Loader from '../../components/Loader';
import { isHeicFormat, convertHeicToFormat } from '../../utils/imageFormatConverter'; // Added HEIC utilities
import { downloadAllImages, downloadImage } from '../../lib/imageProcessing'; // Added for zip download

// Declare cv type for global window scope
declare global {
  interface Window {
    cv: any; // Using 'any' for simplicity, can be refined with d.ts if available
    addEventListener(event: 'opencv-ready', callback: () => void): void;
    removeEventListener(event: 'opencv-ready', callback: () => void): void;
  }
}

interface ImageInfo {
  id: string; // Unique ID for this image instance for worker communication
  name: string;
  size: number;
  type: string;
  url: string;
  originalIndex: number; // To maintain order when collecting results
}

// The embedding from the feature extractor is typically a Float32Array.
type ImageEmbedding = Float32Array;

interface QualityKPIs {
  resolution: { width: number; height: number };
  sharpness: number;
  noiseLevel: number;
  contrast: number;
  exposure: number;
}

interface ImageWithKPIs extends ImageInfo {
  kpis?: QualityKPIs;
  isBestSharpness?: boolean;
  isBestNoise?: boolean;
  isBestContrast?: boolean;
  isBestExposure?: boolean;
  isBestResolution?: boolean;
  isOverallBest?: boolean; // Added for overall best in group
}

export default function ImageDuplicateDetectionPage() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [workerStatus, setWorkerStatus] = useState<string>('Worker starting...');
  const [imageGroups, setImageGroups] = useState<number[][]>([]);
  const [imageKpis, setImageKpis] = useState<Record<string, QualityKPIs>>({});
  const [analyzingQualityDirectly, setAnalyzingQualityDirectly] = useState<number | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [isDownloadingSingleId, setIsDownloadingSingleId] = useState<string | null>(null); // For individual image download status
  const [allGroupsAnalyzedForBest, setAllGroupsAnalyzedForBest] = useState<boolean>(false);
  const [imagesToDownloadCount, setImagesToDownloadCount] = useState<number>(0);
  const [totalUploadedImagesCount, setTotalUploadedImagesCount] = useState<number>(0);
  
  const imageInfoRef = useRef<ImageInfo[]>([]);
  const imageEmbeddingsRef = useRef<(ImageEmbedding | null)[]>([]);
  
  const workerRef = useRef<Worker | null>(null);
  const [embeddingsMap, setEmbeddingsMap] = useState<Record<string, ImageEmbedding | null>>({});
  const [pendingFilesCount, setPendingFilesCount] = useState<number>(0);
  const [isCvReady, setIsCvReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const workerInstance = new Worker(new URL('./image-feature-extraction.worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = workerInstance;
    setWorkerStatus('Worker initializing...');
    workerInstance.postMessage({ type: 'load' });

    workerInstance.onmessage = (event: MessageEvent) => {
      const { status: workerMsgStatus, data, imageId, embedding } = event.data;
      switch (workerMsgStatus) {
        case 'worker_started':
        case 'initializing':
        case 'loading_model':
        case 'model_loaded':
          setWorkerStatus(data || workerMsgStatus);
          break;
        case 'ready':
          setWorkerStatus(data || workerMsgStatus);
          setStatus('Worker ready. Select images to find duplicates.');
          break;
        case 'loading_progress':
          break;
        case 'processing':
          setStatus(`Processing image ID: ${imageId}...`);
          break;
        case 'extraction_complete':
          setEmbeddingsMap(prevMap => ({ ...prevMap, [imageId]: embedding as ImageEmbedding }));
          setPendingFilesCount(prevCount => prevCount - 1);
          break;
        case 'error':
          if (imageId) {
            setEmbeddingsMap(prevMap => ({ ...prevMap, [imageId]: null }));
            setPendingFilesCount(prevCount => prevCount - 1);
            setStatus(`Error processing image ID ${imageId}: ${data}.`);
          } else {
            setWorkerStatus(`Worker error: ${data}`);
            setStatus(`Worker error: ${data}. Please refresh or try again.`);
          }
          console.error('Main: Worker reported error:', data);
          break;
        default:
          console.warn('Main: Unknown message from worker:', event.data);
      }
    };

    workerInstance.onerror = (errorEvent) => {
      console.error('Main: Worker error event:', errorEvent);
      setWorkerStatus('Worker encountered a critical error.');
      setStatus('A critical error occurred with the feature worker. Please refresh the page.');
    };
    
    const checkOpenCV = () => {
      if (window.cv) { // Simplified check
        setIsCvReady(true);
        console.log('Main: OpenCV is ready on the main thread.');
      } else {
        console.log('Main: Waiting for OpenCV to be ready on the main thread...');
        let attempts = 0;
        const intervalId = setInterval(() => {
            if (window.cv) { // Simplified check
                setIsCvReady(true);
                console.log('Main: OpenCV became ready on the main thread (interval check).');
                clearInterval(intervalId);
            } else if (attempts++ > 100) { // ~10 seconds timeout
                console.error('Main: OpenCV did not become ready on the main thread.');
                setStatus('OpenCV failed to load. Quality analysis may be unavailable.');
                clearInterval(intervalId);
            }
        }, 100);
      }
    };
    checkOpenCV();

    return () => {
      workerRef.current?.terminate();
      imageInfoRef.current.forEach(info => URL.revokeObjectURL(info.url));
    };
  }, []);

  useEffect(() => {
    if (imageInfoRef.current.length > 0 && pendingFilesCount === 0 && Object.keys(embeddingsMap).length === imageInfoRef.current.length) {
      setStatus('All images processed. Analyzing for duplicates...');
      const orderedEmbeddings: (ImageEmbedding | null)[] = new Array(imageInfoRef.current.length).fill(null);
      let successfullyProcessedCount = 0;
      imageInfoRef.current.forEach(info => {
        const embedding = embeddingsMap[info.id];
        if (embedding) {
          orderedEmbeddings[info.originalIndex] = embedding;
          successfullyProcessedCount++;
        } else {
          orderedEmbeddings[info.originalIndex] = null;
        }
      });
      imageEmbeddingsRef.current = orderedEmbeddings;
      setImageKpis({});
      if (successfullyProcessedCount > 0) {
        const duplicateGroups = findAndGroupDuplicates(orderedEmbeddings, 0.98);
        setImageGroups(duplicateGroups);
        const groupSummary = duplicateGroups.filter(g => g.length > 1).length > 0 
          ? `${duplicateGroups.filter(g => g.length > 1).length} duplicate set(s) found.`
          : "No direct duplicates found.";
        setStatus(`Analysis complete. ${groupSummary} Processed ${successfullyProcessedCount}/${imageInfoRef.current.length} images.`);
      } else {
        setStatus(`No images could be processed successfully. Processed ${successfullyProcessedCount}/${imageInfoRef.current.length} images.`);
        setImageGroups([]);
      }
    }
  }, [pendingFilesCount, embeddingsMap]);

  function cosineSimilarity(vec1: ImageEmbedding, vec2: ImageEmbedding): number {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  function findAndGroupDuplicates(
    embeddings: (ImageEmbedding | null)[],
    threshold = 0.98
  ): number[][] {
    const groups: number[][] = [];
    const visitedOriginalIndices = new Set<number>();
    const validEntries: { embedding: ImageEmbedding; originalIndex: number }[] = [];
    embeddings.forEach((emb, index) => {
      if (emb) {
        validEntries.push({ embedding: emb, originalIndex: index });
      }
    });
    for (let i = 0; i < validEntries.length; i++) {
      const currentEntry = validEntries[i];
      if (visitedOriginalIndices.has(currentEntry.originalIndex)) continue;
      const currentGroup = [currentEntry.originalIndex];
      visitedOriginalIndices.add(currentEntry.originalIndex);
      for (let j = i + 1; j < validEntries.length; j++) {
        const nextEntry = validEntries[j];
        if (visitedOriginalIndices.has(nextEntry.originalIndex)) continue;
        const similarity = cosineSimilarity(currentEntry.embedding, nextEntry.embedding);
        if (similarity > threshold) {
          currentGroup.push(nextEntry.originalIndex);
          visitedOriginalIndices.add(nextEntry.originalIndex);
        }
      }
      if (currentGroup.length > 0) { 
        groups.push(currentGroup);
      }
    }
    return groups.sort((a, b) => b.length - a.length);
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const inputFiles = event.target.files ? Array.from(event.target.files) : [];
    if (inputFiles.length === 0) {
      setStatus('Please select images...');
      return;
    }
    if (!workerRef.current || workerStatus !== 'Worker ready.') {
      setStatus('Feature worker is not ready. Please wait or refresh.');
      return;
    }

    setStatus('Processing selected files (converting HEIC if any)...');
    const processedFiles: File[] = [];
    for (const inputFile of inputFiles) {
      if (await isHeicFormat(inputFile)) {
        console.log(`Main: Detected HEIC file: ${inputFile.name}. Attempting conversion to PNG.`);
        try {
            const convertedFile = await convertHeicToFormat(inputFile, 'png');
            if (convertedFile) {
            processedFiles.push(convertedFile);
            console.log(`Main: Successfully converted ${inputFile.name} to ${convertedFile.name}.`);
            } else {
            console.warn(`Main: Failed to convert HEIC file: ${inputFile.name}. Skipping this file.`);
            setStatus(`Failed to convert HEIC file: ${inputFile.name}. It will be skipped.`);
            // Optionally: alert(`Failed to convert HEIC file: ${inputFile.name}. It will be skipped.`);
            }
        } catch (conversionError) {
            console.error(`Main: Error during HEIC conversion for ${inputFile.name}:`, conversionError);
            setStatus(`Error converting HEIC file: ${inputFile.name}. It will be skipped.`);
        }
      } else {
        processedFiles.push(inputFile); // Add non-HEIC files directly
      }
    }

    if (processedFiles.length === 0) {
      setStatus('No valid files to process after attempting HEIC conversion.');
      return;
    }
    
    // Clear previous results before processing new files
    setImageGroups([]);
    imageInfoRef.current.forEach(info => URL.revokeObjectURL(info.url)); // Revoke old URLs first
    imageInfoRef.current = [];
    imageEmbeddingsRef.current = [];
    setEmbeddingsMap({});
    setImageKpis({});
    setAnalyzingQualityDirectly(null);
    setAllGroupsAnalyzedForBest(false); // Reset analysis state
    setImagesToDownloadCount(0);
    // totalUploadedImagesCount will be set after processing files
    
    const newImageInfos: ImageInfo[] = [];
    // Use the processedFiles array (which includes converted HEICs)
    for (let i = 0; i < processedFiles.length; i++) {
      const file = processedFiles[i];
      const fileUrl = URL.createObjectURL(file);
      const imageId = String(i); // imageId based on the new processedFiles array
      newImageInfos.push({
        id: imageId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        originalIndex: i, // originalIndex now refers to index in processedFiles
      });
    }
    imageInfoRef.current = newImageInfos;

    if (newImageInfos.length > 0) {
      setPendingFilesCount(newImageInfos.length);
      setTotalUploadedImagesCount(newImageInfos.length); // Set total count here
      setStatus(`Sending ${newImageInfos.length} images to worker for processing...`);
      newImageInfos.forEach((info) => {
        workerRef.current?.postMessage({
          type: 'extractFeatures',
          data: { imageUrl: info.url, imageId: info.id }
        });
      });
    } else {
      // This case should ideally not be reached if processedFiles.length > 0 check passed
      setStatus('No valid images selected to process.');
    }
  };

  async function calculateKpisDirectly(imageDataUrl: string, imageId: string): Promise<QualityKPIs | null> {
    if (!isCvReady || !window.cv || !window.cv.imread) {
        console.error('OpenCV not ready for KPI calculation or imread not found.');
        setStatus('OpenCV not ready. Cannot calculate quality.');
        return null;
    }
    console.log(`Main: Starting KPI calculation for imageId: ${imageId} directly.`);

    try {
        const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log(`Main: Image ${imageId} loaded for KPI (${img.width}x${img.height}).`);
                resolve(img);
            };
            img.onerror = (eventOrMessage: Event | string) => { // More robust error handling
                console.error(`Main: Failed to load image ${imageId} for KPI from data URL.`, eventOrMessage);
                reject(new Error(`Failed to load image ${imageId} for KPI.`));
            };
            img.src = imageDataUrl;
        });

        const cv = window.cv as any; // Explicitly cast to any to handle potential type mismatches
        const src = cv.imread(imgElement);
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        const laplacian = new cv.Mat();
        cv.Laplacian(gray, laplacian, cv.CV_64F, 1, 1, 0, cv.BORDER_DEFAULT);
        
        // Correct usage of meanStdDev for Laplacian variance (sharpness)
        const meanLap = new cv.Mat();
        const stdDevLap = new cv.Mat();
        cv.meanStdDev(laplacian, meanLap, stdDevLap);
        const sharpness = Math.pow(stdDevLap.data64F[0], 2); // Get stddev value
        laplacian.delete(); meanLap.delete(); stdDevLap.delete();

        const blurred = new cv.Mat();
        const noiseMat = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
        cv.absdiff(gray, blurred, noiseMat);

        // Correct usage of meanStdDev for noise level
        const meanNoise = new cv.Mat();
        const stdDevNoise = new cv.Mat();
        cv.meanStdDev(noiseMat, meanNoise, stdDevNoise);
        const noiseLevel = stdDevNoise.data64F[0]; // Get stddev value
        blurred.delete(); noiseMat.delete(); meanNoise.delete(); stdDevNoise.delete();

        // Correct usage of meanStdDev for contrast (stddev of grayscale image)
        const meanContrast = new cv.Mat();
        const stdDevContrast = new cv.Mat();
        cv.meanStdDev(gray, meanContrast, stdDevContrast);
        const contrast = stdDevContrast.data64F[0]; // Get stddev value
        meanContrast.delete(); stdDevContrast.delete();

        // Correct usage of mean for exposure
        const meanExposureVec = cv.mean(gray);
        const exposure = meanExposureVec[0];

        gray.delete(); src.delete();

        const kpis: QualityKPIs = {
            resolution: { width: imgElement.naturalWidth, height: imgElement.naturalHeight },
            sharpness,
            noiseLevel,
            contrast,
            exposure,
        };
        console.log(`Main: KPI calculation complete for ${imageId}.`, kpis);
        return kpis;
    } catch (error) {
        console.error(`Main: Error calculating KPIs for image ${imageId} directly:`, error);
        setStatus(`Error calculating quality for image ${imageId}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
  }
  
  const isLoading = workerStatus !== 'Worker ready.' || pendingFilesCount > 0 || analyzingQualityDirectly !== null;
  const isActionDisabled = isLoading || isDownloadingAll || isDownloadingSingleId !== null;

  const duplicateSets = imageGroups.filter(group => group.length > 1);
  const uniqueImageIndices = imageGroups.filter(group => group.length === 1).flat();

  const handleAnalyzeQuality = async (groupIndex: number) => {
    if (!isCvReady) {
        setStatus('OpenCV is not ready for quality analysis. Please wait.');
        console.warn("Main: OpenCV not ready for analysis call.");
        return;
    }
    const group = imageGroups[groupIndex];
    if (!group || group.length <= 1) {
        setStatus("No duplicates in this group to analyze.");
        return;
    }

    setAnalyzingQualityDirectly(groupIndex);
    setStatus(`Analyzing quality for images in group ${groupIndex + 1}...`);
    console.log(`Main: Analyzing group ${groupIndex}, which contains original indices:`, group);
    
    let processedCount = 0;
    let kpisUpdatedForGroup = false;
    const newKpisForGroup: Record<string, QualityKPIs> = {};

    for (const imageOriginalIndex of group) {
        const imageInfo = imageInfoRef.current[imageOriginalIndex];
        if (imageInfo && imageInfo.url) {
            console.log(`Main: Processing imageOriginalIndex: ${imageOriginalIndex} in group ${groupIndex}`);
            console.log(`Main: imageInfo for index ${imageOriginalIndex}:`, imageInfo);
            if (!imageKpis[imageInfo.id]) {
                console.log(`Main: Image ${imageInfo.id} has URL. Checking for existing KPIs.`);
                console.log(`Main: Sending image ${imageInfo.id} (URL: ${imageInfo.url.substring(0,50)}...) for KPI calculation.`);
                const kpis = await calculateKpisDirectly(imageInfo.url, imageInfo.id);
                if (kpis) {
                    newKpisForGroup[imageInfo.id] = kpis;
                    kpisUpdatedForGroup = true;
                }
            } else {
                console.log(`Main: KPIs already exist for image ${imageInfo.id}, skipping.`);
            }
            processedCount++;
            setStatus(`Analyzed ${processedCount}/${group.length} in group ${groupIndex + 1}. Image: ${imageInfo.name}`);
        } else {
            console.warn(`Main: Skipping imageOriginalIndex ${imageOriginalIndex} due to missing imageInfo or URL. imageInfo:`, imageInfo);
            processedCount++; // Still count as processed to avoid endless loop if data is bad
        }
    }

    if (kpisUpdatedForGroup) {
        setImageKpis(prevKpisState => ({ ...prevKpisState, ...newKpisForGroup }));
    }
    
    console.log(`Main: Finished iterating group ${groupIndex}. Total images processed in call: ${processedCount}`);
    if (group.every(idx => !!(imageKpis[imageInfoRef.current[idx]?.id] || newKpisForGroup[imageInfoRef.current[idx]?.id]))) {
      setStatus(`Quality analysis complete for group ${groupIndex + 1}.`);
    } else {
      setStatus(`Quality analysis partially done for group ${groupIndex + 1}. Some images might have failed or were skipped.`);
    }
    setAnalyzingQualityDirectly(null);
  };

  const getBestInGroup = (group: number[], metric: keyof QualityKPIs, lowerIsBetter = false): Record<string, boolean> => {
    const bestMap: Record<string, boolean> = {};
    let bestValue: number | undefined = undefined;
    let bestImageId: string | undefined = undefined;

    group.forEach(index => {
        const imageInfo = imageInfoRef.current[index];
        if (imageInfo && (imageKpis[imageInfo.id])) { // Check current state for KPIs
            const kpiSet = imageKpis[imageInfo.id];
            if (!kpiSet) return;

            const kpiValue = metric === 'resolution' 
                ? kpiSet.resolution.width * kpiSet.resolution.height
                : kpiSet[metric];
            
            if (typeof kpiValue === 'number') {
                if (bestValue === undefined || (lowerIsBetter ? kpiValue < bestValue : kpiValue > bestValue)) {
                    bestValue = kpiValue;
                    bestImageId = imageInfo.id;
                }
            }
        }
    });
    if (bestImageId) {
        bestMap[bestImageId] = true;
    }
    return bestMap;
  };

  // Helper function to determine the best image in a group based on KPIs
  function determineBestImageInGroup(
    groupOriginalIndices: number[],
    currentImageKpis: Record<string, QualityKPIs>,
    allImageInfos: ImageInfo[]
  ): ImageInfo | null {
    const candidates = groupOriginalIndices
      .map(index => allImageInfos[index])
      .filter(info => info && currentImageKpis[info.id]) // Ensure info and KPIs exist
      .map(info => ({ info, kpis: currentImageKpis[info.id]! }));

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].info;

    candidates.sort((a, b) => {
      const kpisA = a.kpis;
      const kpisB = b.kpis;

      // 1. Resolution (desc)
      const resA = kpisA.resolution.width * kpisA.resolution.height;
      const resB = kpisB.resolution.width * kpisB.resolution.height;
      if (resA !== resB) return resB - resA;

      // 2. Sharpness (desc)
      if (kpisA.sharpness !== kpisB.sharpness) return kpisB.sharpness - kpisA.sharpness;

      // 3. Noise (asc)
      if (kpisA.noiseLevel !== kpisB.noiseLevel) return kpisA.noiseLevel - kpisB.noiseLevel;

      // 4. Contrast (desc)
      if (kpisA.contrast !== kpisB.contrast) return kpisB.contrast - kpisA.contrast;

      // 5. Exposure (desc)
      if (kpisA.exposure !== kpisB.exposure) return kpisB.exposure - kpisA.exposure;
      
      return 0;
    });
    return candidates[0].info;
  }

  // Helper function to calculate KPIs for a group if they are missing
  async function calculateKpisForGroupIfNeeded(
    groupOriginalIndices: number[],
    allImageInfos: ImageInfo[]
    // No need to pass imageKpis or setImageKpis, as it reads and sets global state directly or via calculateKpisDirectly
  ): Promise<boolean> { // Returns true if analysis was attempted/successful for at least one image
    if (!isCvReady) {
      setStatus('OpenCV not ready for quality analysis. Cannot ensure best image selection.');
      return false;
    }
    
    const groupImagesToAnalyze = groupOriginalIndices
      .map(index => allImageInfos[index])
      .filter(info => info && !imageKpis[info.id]); // Filter for images that need KPIs

    if (groupImagesToAnalyze.length === 0) {
      return true; // All KPIs already present for this group
    }

    setStatus(`Analyzing quality for ${groupImagesToAnalyze.length} image(s) to select the best for download...`);
    let kpisUpdatedForGroup = false;
    const newKpisForGroup: Record<string, QualityKPIs> = {};

    for (const imageInfo of groupImagesToAnalyze) {
      if (imageInfo && imageInfo.url) {
        const kpis = await calculateKpisDirectly(imageInfo.url, imageInfo.id);
        if (kpis) {
          newKpisForGroup[imageInfo.id] = kpis;
          kpisUpdatedForGroup = true;
        }
      }
    }

    if (kpisUpdatedForGroup) {
      setImageKpis(prevKpisState => ({ ...prevKpisState, ...newKpisForGroup }));
    }
    setStatus('Pre-download quality analysis complete for the current group.');
    return true;
  }

  const handleDownloadAll = async () => {
    if (imageInfoRef.current.length === 0 || (!duplicateSets.length && !uniqueImageIndices.length)) {
      setStatus("No images to download.");
      return;
    }
    if (!isCvReady && duplicateSets.length > 0) {
        setStatus("OpenCV is not ready. Quality analysis for duplicate sets cannot be performed for 'Download All'. Please wait for OpenCV or analyze groups individually first.");
        // Optionally, allow download of unique images only, or all images without best selection
        // For now, we halt if best selection from duplicates is expected but not possible.
        // Consider a modified download if only unique images are present.
        if (duplicateSets.length > 0) return;
    }

    setIsDownloadingAll(true);
    setStatus("Preparing files for download...");

    const imagesToDownload: { dataUrl: string; name: string, id?: string, type?: string, size?: number }[] = [];

    // 1. Add unique images
    uniqueImageIndices.forEach(index => {
      const imageInfo = imageInfoRef.current[index];
      if (imageInfo) {
        imagesToDownload.push({ 
            dataUrl: imageInfo.url, 
            name: imageInfo.name,
            id: imageInfo.id,
            type: imageInfo.type,
            size: imageInfo.size 
        });
      }
    });

    // 2. Add best image from each duplicate set
    for (const group of duplicateSets) { // group is number[] of originalIndices
      await calculateKpisForGroupIfNeeded(group, imageInfoRef.current);
      
      const bestImageInGroup = determineBestImageInGroup(group, imageKpis, imageInfoRef.current);
      if (bestImageInGroup) {
        imagesToDownload.push({ 
            dataUrl: bestImageInGroup.url, 
            name: bestImageInGroup.name,
            id: bestImageInGroup.id,
            type: bestImageInGroup.type,
            size: bestImageInGroup.size
        });
      } else {
        console.warn(`Could not determine best image for group (indices: ${group.join(',')}). This group will be omitted from the ZIP.`);
        setStatus(prev => prev + ` Warning: Best image for group with indices ${group.join(',')} could not be determined and was omitted.`);
      }
    }

    if (imagesToDownload.length > 0) {
      try {
        // Adapt to the ImageFile structure expected by downloadAllImages
        const filesForZip = imagesToDownload.map((img, idx) => ({
          id: img.id || `zip-img-${idx}-${Date.now()}`,
          dataUrl: img.dataUrl,
          file: { // Minimal File-like object. Crucially provides 'name'.
            name: img.name,
            type: img.type || 'image/png',
            size: img.size || 0,
            lastModified: Date.now(), 
            webkitRelativePath: '',
            arrayBuffer: (() => Promise.resolve(new ArrayBuffer(0))) as any, // Dummy implementations for File interface
            slice: (() => new Blob()) as any,
            stream: (() => new ReadableStream()) as any,
            text: (() => Promise.resolve('')) as any,
          } as File,
          // Provide other potentially required ImageFile fields with defaults or from img source
          thumbnailDataUrl: img.dataUrl, 
          processedDataUrl: img.dataUrl,
          processedThumbnailUrl: img.dataUrl, // Defaulting to dataUrl
          adjustments: {} as any, // Assuming these are not critical for downloadAllImages logic
          watermark: {} as any,
          backgroundRemoved: false, // Default value
          hasBeenProcessed: true, // Marking as "processed" in the sense of being selected for download
        }));

        setStatus(`Zipping ${imagesToDownload.length} image(s)...`);
        // Using true for the third argument to indicate zipping, similar to background-removal page
        // The actual zip name will likely be a default one generated by downloadAllImages
        await downloadAllImages(filesForZip, 'png', true); 
        setStatus("Download complete!");
      } catch (error) {
        console.error("Error during Download All:", error);
        setStatus("Error creating ZIP file for download.");
      }
    } else {
      setStatus("No images were selected for download (e.g. no unique images and no best images found in groups).");
    }

    setIsDownloadingAll(false);
  };

  const handleDownloadSingleFromGroup = async (imageToDownload: ImageInfo) => {
    if (!imageToDownload || !imageToDownload.url) {
      setStatus("Image data is missing, cannot download.");
      return;
    }
    setIsDownloadingSingleId(imageToDownload.id);
    setStatus(`Downloading ${imageToDownload.name}...`);
    try {
      // Assuming downloadImage takes (url, filename, format)
      // The format 'png' is a guess; adjust if ImageFormat has specific values like 'PNG'
      await downloadImage(imageToDownload.url, imageToDownload.name, 'png');
      setStatus(`${imageToDownload.name} downloaded successfully.`);
    } catch (error) {
      console.error(`Error downloading single image ${imageToDownload.name}:`, error);
      setStatus(`Failed to download ${imageToDownload.name}.`);
    }
    setIsDownloadingSingleId(null);
  };

  // Function to analyze all groups to prepare for best selection download
  const handleAnalyzeAllGroupsForBest = async () => {
    if (!isCvReady && duplicateSets.length > 0) {
      setStatus("OpenCV is not ready. Quality analysis for duplicate sets cannot be performed. Please wait for OpenCV.");
      return;
    }
    if (duplicateSets.length === 0 && uniqueImageIndices.length > 0) {
      // No duplicate sets to analyze, only unique images
      setImagesToDownloadCount(uniqueImageIndices.length);
      setAllGroupsAnalyzedForBest(true);
      setStatus("Only unique images present. Ready to download.");
      return;
    } 
    if (duplicateSets.length === 0 && uniqueImageIndices.length === 0) {
        setStatus("No images to analyze or download.");
        return;
    }

    setIsDownloadingAll(true); // Use isDownloadingAll to indicate general processing for this button
    setStatus("Analyzing all groups for best image selection...");
    let groupsProcessedSuccessfully = 0;

    for (let i = 0; i < duplicateSets.length; i++) {
      const group = duplicateSets[i];
      setStatus(`Analyzing group ${i + 1} of ${duplicateSets.length} for best image...`);
      const success = await calculateKpisForGroupIfNeeded(group, imageInfoRef.current);
      if (success) {
        // KPIs for this group should now be in imageKpis state
        groupsProcessedSuccessfully++;
      }
      // Small delay to allow UI to update status, if needed, though await should handle it
      // await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    const calculatedImagesToDownload = uniqueImageIndices.length + duplicateSets.length; // Assuming one best from each duplicate group
    setImagesToDownloadCount(calculatedImagesToDownload);
    setAllGroupsAnalyzedForBest(true);
    
    if (groupsProcessedSuccessfully === duplicateSets.length) {
      setStatus(`All ${duplicateSets.length} duplicate groups analyzed. Ready to download ${calculatedImagesToDownload} best images.`);
    } else {
      setStatus(
        `Analysis for best selection partially complete (${groupsProcessedSuccessfully}/${duplicateSets.length} groups). ` +
        `Ready to download ${calculatedImagesToDownload} images (best available will be chosen).`
      );
    }
    setIsDownloadingAll(false);
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          Image Duplicate Detection
        </h1>

        {workerStatus.startsWith('Worker starting') || workerStatus.startsWith('Worker initializing') || !isCvReady ? (
          <div className="brutalist-border p-4 text-center mb-6 bg-white">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader size="lg" />
              <h3 className="text-lg font-bold mb-2">
                {workerStatus.includes('model') ? "Loading AI Model..." 
                  : !isCvReady ? "Initializing Quality Tools..." 
                  : "Initializing Tool..."}
              </h3>
              <p className="text-sm text-gray-600">
                {workerStatus.includes('model') 
                  ? "The powerful AI model is being loaded. This might take a moment."
                  : !isCvReady 
                  ? "Getting OpenCV ready for image quality analysis..."
                  : "Getting things ready for duplicate detection. Please wait."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card 
                collapsible={false}
                title="Find Duplicate Images"
                variant="accent"
              >
                <div className="space-y-6 relative">
                  {pendingFilesCount > 0 && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-30 rounded-md backdrop-blur-sm">
                      <Loader size="lg" />
                      <p className="mt-4 text-lg font-bold text-gray-700">{status}</p>
                    </div>
                  )}
                  
                  <div className="brutalist-border p-4 bg-white">
                    <h3 className="font-bold mb-2">Upload Your Images</h3>
                    <p className="text-sm mb-2">
                      Select multiple images to find duplicates. The tool will analyze them and group similar ones together.
                    </p>
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,.heic,.heif" // Added .heic, .heif
                        className="hidden"
                        id="fileInput"
                        disabled={isLoading}
                      />
                      <div className="flex flex-col items-center gap-2 space-y-6">
                        <label htmlFor="fileInput" className="inline-block">
                          <Button as="span" variant="primary" size="lg" disabled={isLoading || !isCvReady}>
                            {isLoading ? "Processing..." 
                              : !isCvReady ? "Tools Initializing..." 
                              : "Select Images"}
                          </Button>
                        </label>
                        <span className="text-xs text-gray-600">
                          Supports JPG, PNG, WEBP. Max 50 images at once.
                        </span>
                        <p className="text-sm font-semibold">{status}</p>
                        <p className="text-xs text-gray-500">Feature Worker: {workerStatus}</p>
                        {!isCvReady && <p className="text-xs text-yellow-600">Quality Analyzer: OpenCV loading...</p>}
                        {isCvReady && <p className="text-xs text-green-600">Quality Analyzer: OpenCV Ready</p>}
                      </div>
                  </div>

                  {(duplicateSets.length > 0 || uniqueImageIndices.length > 0) && (
                    <div className="brutalist-border p-6 bg-white mt-6 relative">
                      <h2 className="text-xl font-bold mb-4">Detection Results:</h2>
                      
                      {duplicateSets.map((group, groupIndex) => {
                        const bestSharpnessMap = getBestInGroup(group, 'sharpness');
                        const bestNoiseMap = getBestInGroup(group, 'noiseLevel', true);
                        const bestContrastMap = getBestInGroup(group, 'contrast');
                        const bestExposureMap = getBestInGroup(group, 'exposure');
                        const bestResolutionMap = getBestInGroup(group, 'resolution');

                        // Determine overall best image for this group if KPIs are available
                        let overallBestImageIdInGroup: string | null = null;
                        const groupHasKpis = group.every(idx => !!imageKpis[imageInfoRef.current[idx]?.id]);
                        if (groupHasKpis) {
                          const bestImageInfo = determineBestImageInGroup(group, imageKpis, imageInfoRef.current);
                          if (bestImageInfo) {
                            overallBestImageIdInGroup = bestImageInfo.id;
                          }
                        }

                        return (
                        <div key={`duplicate-set-${groupIndex}`} className="mb-8 brutalist-border p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold">
                              {`Duplicate Set ${groupIndex + 1} (${group.length} similar images)`}
                            </h3>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAnalyzeQuality(groupIndex)}
                                disabled={!isCvReady || analyzingQualityDirectly !== null || group.length <=1 }
                            >
                                {analyzingQualityDirectly === groupIndex ? "Analyzing..." 
                                  : (group.every(idx => !!imageKpis[imageInfoRef.current[idx]?.id]) 
                                    ? "Re-Analyze Quality" 
                                    : "Analyze Quality")}
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {group.map((imageOriginalIndex) => {
                              const image = imageInfoRef.current[imageOriginalIndex];
                              if (!image) {
                                return <p key={`missing-dup-${groupIndex}-${imageOriginalIndex}`}>Image data missing (index: {imageOriginalIndex})</p>;
                              }
                              const kpis = imageKpis[image.id];
                              const imageWithKpis: ImageWithKPIs = {
                                ...image,
                                kpis,
                                isBestSharpness: !!bestSharpnessMap[image.id],
                                isBestNoise: !!bestNoiseMap[image.id],
                                isBestContrast: !!bestContrastMap[image.id],
                                isBestExposure: !!bestExposureMap[image.id],
                                isBestResolution: !!bestResolutionMap[image.id],
                                isOverallBest: image.id === overallBestImageIdInGroup, // Set overall best flag
                              };

                              return (
                                <div 
                                  key={`${imageWithKpis.id}-dup-${imageWithKpis.url}`} 
                                  className={`text-center brutalist-border p-1 bg-white flex flex-col relative group ${imageWithKpis.isOverallBest ? 'border-4 border-accent shadow-brutalist' : ''}`}
                                >
                                  {imageWithKpis.isOverallBest && (
                                    <div className="absolute top-0 right-0 m-1 px-2 py-0.5 text-xs font-bold brutalist-border border-2 border-black bg-yellow-300 text-black uppercase z-10">
                                      Best
                                    </div>
                                  )}
                                  <div className="relative w-full" style={{paddingBottom: '100%'}}>
                                    <NextImage
                                      src={imageWithKpis.url}
                                      alt={imageWithKpis.name}
                                      fill
                                      className="rounded object-contain"
                                    />
                                  </div>
                                  <p className="text-xs truncate mt-1 px-1" title={imageWithKpis.name}>{imageWithKpis.name}</p>
                                  {kpis && (
                                    <div className="text-xs mt-1 p-1 bg-gray-100 brutalist-border-small text-left">
                                      <p className={imageWithKpis.isBestResolution ? "font-bold text-primary" : ""}>Res: {kpis.resolution.width}x{kpis.resolution.height}</p>
                                      <p className={imageWithKpis.isBestSharpness ? "font-bold text-primary" : ""}>Sharp: {kpis.sharpness.toFixed(2)}</p>
                                      <p className={imageWithKpis.isBestNoise ? "font-bold text-primary" : ""}>Noise: {kpis.noiseLevel.toFixed(2)}</p>
                                      <p className={imageWithKpis.isBestContrast ? "font-bold text-primary" : ""}>Contrast: {kpis.contrast.toFixed(2)}</p>
                                      <p className={imageWithKpis.isBestExposure ? "font-bold text-primary" : ""}>Exposure: {kpis.exposure.toFixed(2)}</p>
                                    </div>
                                  )}
                                  {/* Download button for individual image */}
                                  <div className="mt-auto pt-1">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="w-full text-xs py-1 mt-1"
                                      onClick={() => handleDownloadSingleFromGroup(imageWithKpis)}
                                      disabled={isActionDisabled || isDownloadingSingleId === imageWithKpis.id}
                                    >
                                      {isDownloadingSingleId === imageWithKpis.id ? 'Downloading...' : 'Download'}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )})} 

                      {uniqueImageIndices.length > 0 && (
                        <div className="mb-8 brutalist-border p-4 bg-gray-50">
                          <h3 className="text-lg font-semibold mb-3">
                            Unique Images ({uniqueImageIndices.length} image(s) with no direct duplicates)
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {uniqueImageIndices.map((imageOriginalIndex, index) => {
                              const image = imageInfoRef.current[imageOriginalIndex];
                              if (!image) {
                                return <p key={`missing-unique-${index}-${imageOriginalIndex}`}>Image data missing (index: {imageOriginalIndex})</p>;
                              }
                              return (
                                <div key={`${image.id}-unique-${image.url}`} className="text-center brutalist-border p-1 bg-white">
                                  <div className="relative w-full" style={{paddingBottom: '100%'}}> 
                                    <NextImage
                                      src={image.url}
                                      alt={image.name}
                                      fill
                                      className="rounded object-contain"
                                    />
                                  </div>
                                  <p className="text-xs truncate mt-1 px-1" title={image.name}>{image.name}</p>
                                  {/* No download button for unique images here, could be added if desired */}
                                  {/* If adding, would be similar to the one in duplicate sets */}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(duplicateSets.length > 0 || uniqueImageIndices.length > 0) && (
                        <div className="sticky bottom-0 left-0 right-0 z-10 bg-white py-4 border-t border-2 border-t-black mt-6">
                          <div className="flex justify-center">
                            {!allGroupsAnalyzedForBest ? (
                                <Button 
                                    variant="accent" 
                                    onClick={handleAnalyzeAllGroupsForBest}
                                    disabled={isActionDisabled || (!isCvReady && duplicateSets.length > 0) || pendingFilesCount > 0}
                                    className="w-full max-w-md"
                                >
                                    {isDownloadingAll ? "Analyzing All Groups..." : "Analyze All Groups for Best Selection"}
                                </Button>
                            ) : (
                                <Button 
                                    variant="primary"
                                    onClick={handleDownloadAll}
                                    disabled={isActionDisabled || imagesToDownloadCount === 0}
                                    className="w-full max-w-md"
                                >
                                    {isDownloadingAll 
                                        ? "Preparing Download..." 
                                        : `Download ${imagesToDownloadCount} Best Images (from ${totalUploadedImagesCount} total)`}
                                </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {imageInfoRef.current.length > 0 && duplicateSets.length === 0 && uniqueImageIndices.length === 0 && !isLoading && (
                     <div className="brutalist-border p-6 bg-white mt-6">
                        <p className="text-center text-gray-600">No images processed or no groups formed yet. Ensure images were selected and processing completed.</p>
                    </div>
                  )}
                  { /* Show global status or errors related to download all if any */ }
                  {(isDownloadingAll || isDownloadingSingleId) && <p className="text-center text-sm font-bold mt-4">{status}</p>}
                </div>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card title="How Duplicate Detection Works" variant="accent">
                <div className="space-y-4">
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">1. Upload Your Images</h3>
                    <p className="text-sm">
                      Click the &quot;Select Images&quot; button and choose the images you want to check for duplicates. You can select multiple files at once.
                    </p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">2. AI-Powered Analysis</h3>
                    <p className="text-sm">
                      Our system uses a sophisticated AI model (Vision Transformer) to extract unique features from each image. This allows us to understand the content and appearance of your images.
                    </p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">3. Similarity Scoring</h3>
                    <p className="text-sm">
                      The extracted features are then compared using cosine similarity. This mathematical measure determines how similar two images are based on their visual content.
                    </p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">4. Grouping Duplicates</h3>
                    <p className="text-sm">
                      Images with a similarity score above a certain threshold (e.g., 98%) are grouped together as duplicates. Images that don&apos;t have close matches are considered unique.
                    </p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">5. View Results</h3>
                    <p className="text-sm">
                      The results are displayed with duplicate sets grouped together at the top, followed by unique images. You can then easily identify and manage your similar photos.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 

