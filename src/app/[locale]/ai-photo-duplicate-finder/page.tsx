"use client";

import { useEffect, useState, useRef, ChangeEvent } from 'react';
import NextImage from 'next/image'; // Aliased import
import { useRouter } from 'next/navigation';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Loader from '../../components/Loader';
import ProBadge from '../../components/ProBadge';
import ProUpgradeDialog from '../../components/ProUpgradeDialog';
import PricingCard from '../../components/PricingCard'; // Import PricingCard
import { useIsPro } from '../../hooks/useIsPro';
import { isHeicFormat, convertHeicToFormat } from '../../utils/imageFormatConverter'; // Added HEIC utilities
import { downloadAllImages, downloadImage } from '../../lib/imageProcessing'; // Added for zip download
import { useTranslations } from 'next-intl';

// Declare cv type for global window scope
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any; // Using 'any' for simplicity, can be refined with d.ts if available
    addEventListener(event: 'opencv-ready', callback: () => void): void;
    removeEventListener(event: 'opencv-ready', callback: () => void): void;
  }
}

// Free user image limit constant
const FREE_USER_IMAGE_LIMIT = 5;

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
  const t = useTranslations('ImageDuplicateDetectionPage');
  const { isProUser, isLoading: isProStatusLoading } = useIsPro();
  const router = useRouter();
  const [status, setStatus] = useState<string>(t('AppInitializing'));
  const [workerStatus, setWorkerStatus] = useState<string>(t('AISetup'));
  const [imageGroups, setImageGroups] = useState<number[][]>([]);
  const [imageKpis, setImageKpis] = useState<Record<string, QualityKPIs>>({});
  const [analyzingQualityDirectly, setAnalyzingQualityDirectly] = useState<number | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [isDownloadingSingleId, setIsDownloadingSingleId] = useState<string | null>(null); // For individual image download status
  const [allGroupsAnalyzedForBest, setAllGroupsAnalyzedForBest] = useState<boolean>(false);
  const [imagesToDownloadCount, setImagesToDownloadCount] = useState<number>(0);
  const [totalUploadedImagesCount, setTotalUploadedImagesCount] = useState<number>(0);
  // Add new state for similarity threshold
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.98);
  const [processingThresholdChange, setProcessingThresholdChange] = useState<boolean>(false);
  const [isAddingMoreImages, setIsAddingMoreImages] = useState<boolean>(false);
  // Add state for Pro dialog
  const [showProDialog, setShowProDialog] = useState<boolean>(false);
  
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
    setWorkerStatus(t('AIEngineInitializing'));
    workerInstance.postMessage({ type: 'load' });

    workerInstance.onmessage = (event: MessageEvent) => {
      const { status: workerMsgStatus, data, imageId, embedding } = event.data;
      switch (workerMsgStatus) {
        case 'worker_started':
          setWorkerStatus(t('AIEngineStarted'));
          break;
        case 'initializing':
          setWorkerStatus(t('AIInitializing'));
          break;
        case 'loading_model':
          setWorkerStatus(t('AILoadingModel'));
          break;
        case 'model_loaded':
          setWorkerStatus(t('AIModelLoaded'));
          break;
        case 'ready':
          setWorkerStatus(t('AIReady'));
          setStatus(t('AIReadyPrompt'));
          break;
        case 'loading_progress':
          break;
        case 'processing':
          setStatus(t('ProcessingImage', { imageId }));
          break;
        case 'extraction_complete':
          setEmbeddingsMap(prevMap => ({ ...prevMap, [imageId]: embedding as ImageEmbedding }));
          setPendingFilesCount(prevCount => prevCount - 1);
          break;
        case 'error':
          if (imageId) {
            setEmbeddingsMap(prevMap => ({ ...prevMap, [imageId]: null }));
            setPendingFilesCount(prevCount => prevCount - 1);
            setStatus(t('ErrorProcessingImage', { imageId, data }));
          } else {
            setWorkerStatus(t('AIEngineError', { data }));
            setStatus(t('AIEngineErrorRefresh', { data }));
          }
          console.error('Main: Worker reported error:', data);
          break;
        default:
          console.warn('Main: Unknown message from worker:', event.data);
      }
    };

    workerInstance.onerror = (errorEvent) => {
      console.error('Main: Worker error event:', errorEvent);
      setWorkerStatus(t('AICriticalError'));
      setStatus(t('AICriticalErrorRefresh'));
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
                setStatus(t('QualityToolsError'));
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
  }, [t]); // Added t to dependency array

  useEffect(() => {
    if (imageInfoRef.current.length > 0 && pendingFilesCount === 0 && Object.keys(embeddingsMap).length === imageInfoRef.current.length) {
      setStatus(t('AllImagesProcessedAnalyzing'));
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
        const duplicateGroups = findAndGroupDuplicates(orderedEmbeddings, similarityThreshold);
        setImageGroups(duplicateGroups);
        const groupSummary = duplicateGroups.filter(g => g.length > 1).length > 0 
          ? t('DuplicateSetsFound', { count: duplicateGroups.filter(g => g.length > 1).length })
          : t('NoDuplicatesFound');
        setStatus(t('AnalysisCompleteSummary', { 
            groupSummary, 
            successfullyProcessedCount, 
            totalImagesCount: imageInfoRef.current.length 
        }));
      } else {
        setStatus(t('NoImagesProcessedSuccessfully', { 
            successfullyProcessedCount, 
            totalImagesCount: imageInfoRef.current.length 
        }));
        setImageGroups([]);
      }
    }
  }, [pendingFilesCount, embeddingsMap, similarityThreshold, t]); // Added t

  // Add new function to handle threshold changes
  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseFloat(e.target.value);
    setSimilarityThreshold(newThreshold);
  };

  // Add function to reanalyze with new threshold
  const reanalyzeWithNewThreshold = () => {
    if (imageEmbeddingsRef.current.length === 0) {
      setStatus(t('NoImagesForNewThreshold'));
      return;
    }
    
    setProcessingThresholdChange(true);
    setStatus(t('ReanalyzingWithThreshold', { threshold: similarityThreshold.toFixed(2) }));
    
    setTimeout(() => { // Small delay to allow UI update
      const duplicateGroups = findAndGroupDuplicates(imageEmbeddingsRef.current, similarityThreshold);
      setImageGroups(duplicateGroups);
      
      const groupSummary = duplicateGroups.filter(g => g.length > 1).length > 0 
        ? t('DuplicateSetsFound', { count: duplicateGroups.filter(g => g.length > 1).length })
        : t('NoDuplicatesFound');
      
      setStatus(t('AnalysisCompleteWithThreshold', { threshold: similarityThreshold.toFixed(2), groupSummary }));
      setProcessingThresholdChange(false);
      
      // Reset these states since groups have changed
      setAllGroupsAnalyzedForBest(false);
      setImageKpis({});
    }, 100);
  };

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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>, addingMore: boolean = false) => {
    const inputFiles = event.target.files ? Array.from(event.target.files) : [];
    if (inputFiles.length === 0) {
      setStatus(t('PleaseSelectImages'));
      return;
    }
    if (!workerRef.current || workerStatus !== t('AIReady')) {
      setStatus(t('AINotReadyError'));
      return;
    }

    // Set processing state
    setIsAddingMoreImages(addingMore);
    
    // Handle limits for free users - take only the first FREE_USER_IMAGE_LIMIT images
    let fileArray = inputFiles;
    if (!isProUser && !isProStatusLoading) {
      // Check if we need to show the pro upgrade dialog
      if (addingMore) {
        const currentCount = imageInfoRef.current.length;
        if (currentCount + inputFiles.length > FREE_USER_IMAGE_LIMIT) {
          // Only take what we can add
          fileArray = inputFiles.slice(0, Math.max(0, FREE_USER_IMAGE_LIMIT - currentCount));
          // Show pro upgrade dialog
          setShowProDialog(true);
        }
      } else if (inputFiles.length > FREE_USER_IMAGE_LIMIT) {
        // Take only the first FREE_USER_IMAGE_LIMIT images
        fileArray = inputFiles.slice(0, FREE_USER_IMAGE_LIMIT);
        // Show pro upgrade dialog
        setShowProDialog(true);
      }
    }

    setStatus(t('ProcessingFilesHEIC'));
    const processedFiles: File[] = [];
    for (const inputFile of fileArray) {
      if (await isHeicFormat(inputFile)) {
        console.log(`Main: Detected HEIC file: ${inputFile.name}. Attempting conversion to PNG.`);
        try {
            const convertedFile = await convertHeicToFormat(inputFile, 'png');
            if (convertedFile) {
            processedFiles.push(convertedFile);
            console.log(`Main: Successfully converted ${inputFile.name} to ${convertedFile.name}.`);
            } else {
            console.warn(`Main: Failed to convert HEIC file: ${inputFile.name}. Skipping this file.`);
            setStatus(t('HEICConversionFailedSkip', { fileName: inputFile.name }));
            // Optionally: alert(`Failed to convert HEIC file: ${inputFile.name}. It will be skipped.`);
            }
        } catch (conversionError) {
            console.error(`Main: Error during HEIC conversion for ${inputFile.name}:`, conversionError);
            setStatus(t('HEICConversionErrorSkip', { fileName: inputFile.name }));
        }
      } else {
        processedFiles.push(inputFile); // Add non-HEIC files directly
      }
    }

    if (processedFiles.length === 0) {
      setStatus(t('NoValidFilesAfterConversion'));
      return;
    }
    
    // Clear previous results only if not adding more images
    if (!addingMore) {
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
    }
    
    const existingImageCount = imageInfoRef.current.length;
    const newImageInfos: ImageInfo[] = [];
    
    // Use the processedFiles array (which includes converted HEICs)
    for (let i = 0; i < processedFiles.length; i++) {
      const file = processedFiles[i];
      const fileUrl = URL.createObjectURL(file);
      // When adding more images, we need to ensure IDs don't clash with existing images
      const imageId = String(existingImageCount + i);
      newImageInfos.push({
        id: imageId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        originalIndex: existingImageCount + i, // originalIndex now refers to position in combined array
      });
    }
    
    if (addingMore) {
      // Append new images to existing images
      imageInfoRef.current = [...imageInfoRef.current, ...newImageInfos];
    } else {
      // Replace with new images (original behavior)
      imageInfoRef.current = newImageInfos;
    }

    if (newImageInfos.length > 0) {
      setPendingFilesCount(newImageInfos.length);
      const newTotalCount = addingMore ? totalUploadedImagesCount + newImageInfos.length : newImageInfos.length;
      setTotalUploadedImagesCount(newTotalCount); // Set total count here
      setStatus(t('SendingImagesToAI', { count: newImageInfos.length }));
      newImageInfos.forEach((info) => {
        workerRef.current?.postMessage({
          type: 'extractFeatures',
          data: { imageUrl: info.url, imageId: info.id }
        });
      });
    } else {
      // This case should ideally not be reached if processedFiles.length > 0 check passed
      setStatus(t('NoValidImagesSelected'));
    }
  };

  // Add handler for the "Add More Images" button
  const handleAddMoreImages = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(event, true);
  };

  // Handle Pro dialog closing
  const handleCloseProDialog = () => {
    // On close, we can optionally navigate to pricing
    setShowProDialog(false);
  };

  async function calculateKpisDirectly(imageDataUrl: string, imageId: string): Promise<QualityKPIs | null> {
    if (!isCvReady || !window.cv || !window.cv.imread) {
        console.error('OpenCV not ready for KPI calculation or imread not found.');
        setStatus(t('QualityToolsNotReadyKPI'));
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        setStatus(t('ErrorCalculatingQuality', { imageId, error: errorMessage }));
        return null;
    }
  }
  
  const isLoading = workerStatus !== t('AIReady') || pendingFilesCount > 0 || analyzingQualityDirectly !== null || processingThresholdChange || isProStatusLoading;
  const isActionDisabled = isLoading || isDownloadingAll || isDownloadingSingleId !== null;

  const duplicateSets = imageGroups.filter(group => group.length > 1);
  const uniqueImageIndices = imageGroups.filter(group => group.length === 1).flat();

  const handleAnalyzeQuality = async (groupIndex: number) => {
    if (!isCvReady) {
        setStatus(t('QualityToolsNotReadyAnalysisWait'));
        console.warn("Main: OpenCV not ready for analysis call.");
        return;
    }
    const group = imageGroups[groupIndex];
    if (!group || group.length <= 1) {
        setStatus(t("NoDuplicatesInGroup"));
        return;
    }

    setAnalyzingQualityDirectly(groupIndex);
    setStatus(t('AnalyzingGroupQuality', { groupNumber: groupIndex + 1 }));
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
            setStatus(t('AnalyzedProgressInGroup', { 
                processedCount, 
                groupTotal: group.length, 
                groupNumber: groupIndex + 1, 
                imageName: imageInfo.name 
            }));
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
      setStatus(t('QualityAnalysisCompleteForGroup', { groupNumber: groupIndex + 1 }));
    } else {
      setStatus(t('QualityAnalysisPartialForGroup', { groupNumber: groupIndex + 1 }));
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
      setStatus(t('QualityToolsNotReadyBestSelection'));
      return false;
    }
    
    const groupImagesToAnalyze = groupOriginalIndices
      .map(index => allImageInfos[index])
      .filter(info => info && !imageKpis[info.id]); // Filter for images that need KPIs

    if (groupImagesToAnalyze.length === 0) {
      return true; // All KPIs already present for this group
    }

    setStatus(t('AnalyzingQualityForBestDownload', { count: groupImagesToAnalyze.length }));
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
    setStatus(t('PreDownloadAnalysisComplete'));
    return true;
  }

  const handleDownloadAll = async () => {
    if (imageInfoRef.current.length === 0 || (!duplicateSets.length && !uniqueImageIndices.length)) {
      setStatus(t("NoImagesToDownload"));
      return;
    }
    if (!isCvReady && duplicateSets.length > 0) {
        setStatus(t("QualityToolsNotReadyDownloadAll"));
        // Optionally, allow download of unique images only, or all images without best selection
        // For now, we halt if best selection from duplicates is expected but not possible.
        // Consider a modified download if only unique images are present.
        if (duplicateSets.length > 0) return;
    }

    setIsDownloadingAll(true);
    setStatus(t("PreparingDownload"));

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
        setStatus(prev => prev + t('WarningBestImageOmitted'));
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            arrayBuffer: (() => Promise.resolve(new ArrayBuffer(0))) as any, // Dummy implementations for File interface
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            slice: (() => new Blob()) as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stream: (() => new ReadableStream()) as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            text: (() => Promise.resolve('')) as any,
          } as File,
          // Provide other potentially required ImageFile fields with defaults or from img source
          thumbnailDataUrl: img.dataUrl, 
          processedDataUrl: img.dataUrl,
          processedThumbnailUrl: img.dataUrl, // Defaulting to dataUrl
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          adjustments: {} as any, // Assuming these are not critical for downloadAllImages logic
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          watermark: {} as any,
          backgroundRemoved: false, // Default value
          hasBeenProcessed: true, // Marking as "processed" in the sense of being selected for download
        }));

        setStatus(t('ZippingImages', { count: imagesToDownload.length }));
        // Using true for the third argument to indicate zipping, similar to background-removal page
        // The actual zip name will likely be a default one generated by downloadAllImages
        await downloadAllImages(filesForZip, 'png', true); 
        setStatus(t("DownloadComplete"));
      } catch (error) {
        console.error("Error during Download All:", error);
        setStatus(t("ErrorCreatingZIP"));
      }
    } else {
      setStatus(t("NoImagesSelectedForDownload"));
    }

    setIsDownloadingAll(false);
  };

  const handleDownloadSingleFromGroup = async (imageToDownload: ImageInfo) => {
    if (!imageToDownload || !imageToDownload.url) {
      setStatus(t("ImageDataMissingDownload"));
      return;
    }
    setIsDownloadingSingleId(imageToDownload.id);
    setStatus(t('DownloadingImage', { imageName: imageToDownload.name }));
    try {
      // Assuming downloadImage takes (url, filename, format)
      // The format 'png' is a guess; adjust if ImageFormat has specific values like 'PNG'
      await downloadImage(imageToDownload.url, imageToDownload.name, 'png');
      setStatus(t('ImageDownloadedSuccessfully', { imageName: imageToDownload.name }));
    } catch (error) {
      console.error(`Error downloading single image ${imageToDownload.name}:`, error);
      setStatus(t('FailedToDownloadImage', { imageName: imageToDownload.name }));
    }
    setIsDownloadingSingleId(null);
  };

  // Function to analyze all groups to prepare for best selection download
  const handleAnalyzeAllGroupsForBest = async () => {
    if (!isCvReady && duplicateSets.length > 0) {
      setStatus(t("QualityToolsNotReadyAnalyzeAllGroups"));
      return;
    }
    if (duplicateSets.length === 0 && uniqueImageIndices.length > 0) {
      // No duplicate sets to analyze, only unique images
      setImagesToDownloadCount(uniqueImageIndices.length);
      setAllGroupsAnalyzedForBest(true);
      setStatus(t("OnlyUniqueImagesReadyDownload"));
      return;
    } 
    if (duplicateSets.length === 0 && uniqueImageIndices.length === 0) {
        setStatus(t("NoImagesToAnalyzeOrDownload"));
        return;
    }

    setIsDownloadingAll(true); // Use isDownloadingAll to indicate general processing for this button
    setStatus(t("AnalyzingAllGroupsForBest"));
    let groupsProcessedSuccessfully = 0;

    for (let i = 0; i < duplicateSets.length; i++) {
      const group = duplicateSets[i];
      setStatus(t('AnalyzingGroupForBest', { currentGroup: i + 1, totalGroups: duplicateSets.length }));
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
      setStatus(t('AllGroupsAnalyzedReadyDownload', { 
        count: duplicateSets.length, 
        downloadCount: calculatedImagesToDownload 
      }));
    } else {
      setStatus(
        t('AnalysisPartialReadyDownload', {
          processedGroups: groupsProcessedSuccessfully,
          totalGroups: duplicateSets.length,
          downloadCount: calculatedImagesToDownload
        })
      );
    }
    setIsDownloadingAll(false);
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          {t('PageTitle')}
        </h1>

        {workerStatus === t('AISetup') || workerStatus === t('AIEngineInitializing') || !isCvReady || isProStatusLoading ? (
          <div className="brutalist-border p-4 text-center mb-6 bg-white">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader size="lg" />
              <h3 className="text-lg font-bold mb-2">
                {workerStatus.includes(t('AILoadingModel').substring(0,10)) ? t("LoaderTitleLoadingModel") 
                  : !isCvReady ? t("LoaderTitleQualityTools")
                  : isProStatusLoading ? t("LoaderProStatus")
                  : t("LoaderTitleInitializing")}
              </h3>
              <p className="text-sm text-gray-600">
                {workerStatus.includes(t('AILoadingModel').substring(0,10))
                  ? t("LoaderDescriptionLoadingModel")
                  : !isCvReady 
                  ? t("LoaderDescriptionQualityTools")
                  : isProStatusLoading ? t("LoaderProDescription")
                  : t("LoaderDescriptionInitializing")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card 
                collapsible={false}
                title={t('MainCardTitle')}
                variant="accent"
                headerRight={
                  isProUser ? <ProBadge className="ml-2" /> : null
                }
              >
                <div className="space-y-6 relative">
                  {pendingFilesCount > 0 && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-30 rounded-md backdrop-blur-sm">
                      <Loader size="lg" />
                      <p className="mt-4 text-lg font-bold text-gray-700">{status}</p>
                    </div>
                  )}
                  
                  <div className="brutalist-border p-4 bg-white">
                    <h3 className="font-bold mb-2">{t('UploadSectionTitle')}</h3>
                    <p className="text-sm mb-3">
                      {t('UploadSectionDescription')}
                    </p>
                    
                    {/* Info section for pro/free status - styled like image-format-convertor page */}
                    {!isProUser && (
                      <div className="bg-yellow-50 p-3 mb-3 brutalist-border">
                        <p className="text-sm font-bold flex items-center">
                          {t('FreeModeTitle')}
                        </p>
                        <p className="text-xs">
                          {t('FreeModeDescription', { limit: FREE_USER_IMAGE_LIMIT })}
                        </p>
                      </div>
                    )}
                    
                    {isProUser && (
                      <div className="bg-yellow-50 p-3 mb-3 brutalist-border">
                        <p className="text-sm font-bold flex items-center">
                          {t('ProModeTitle')} <ProBadge className="ml-2" />
                        </p>
                        <p className="text-xs">
                          {t('ProModeDescription')}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center space-y-8 w-full py-4">
                      {/* Upload buttons container */}
                      <div className="flex flex-col items-center justify-center w-full space-y-4 max-w-sm">
                        <label htmlFor="fileInput" className="w-full flex justify-center">
                          <Button as="span" variant="primary" size="lg" className="w-full max-w-xs text-center" disabled={isLoading || !isCvReady}>
                            {isLoading ? t('ButtonSelectImagesLoading') 
                              : !isCvReady ? t('ButtonSelectImagesInitializing') 
                              : isProUser ? t('ButtonSelectImages') 
                              : t('ButtonSelectImagesLimit', { limit: FREE_USER_IMAGE_LIMIT })}
                          </Button>
                        </label>
                        
                        {imageInfoRef.current.length > 0 && !isLoading && (
                          <label htmlFor="addMoreInput" className="w-full flex justify-center">
                            <Button 
                              as="span" 
                              variant="default" 
                              size="lg" 
                              className="w-full max-w-xs text-center" 
                              disabled={isLoading || !isCvReady || (!isProUser && imageInfoRef.current.length >= FREE_USER_IMAGE_LIMIT)}
                            >
                              {isLoading && isAddingMoreImages ? t('ButtonAddMoreImagesLoading') : t('ButtonAddMoreImages')}
                            </Button>
                          </label>
                        )}
                      </div>
                      
                      {/* Hidden file inputs */}
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        id="fileInput"
                        disabled={isLoading}
                      />
                      <input
                        type="file"
                        multiple
                        onChange={handleAddMoreImages}
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        id="addMoreInput"
                        disabled={isLoading || (!isProUser && imageInfoRef.current.length >= FREE_USER_IMAGE_LIMIT)}
                      />
                      
                      {/* Status and information section */}
                      <div className="flex flex-col items-center space-y-3 w-full">
                        <span className="text-xs text-gray-600">
                          {t('SupportedFormats')}
                        </span>
                        
                        {/* Image count - like in image-format-convertor */}
                        {imageInfoRef.current.length > 0 && (
                          <div className="flex justify-between items-center w-full max-w-xs">
                            <span className="text-sm font-medium">
                              {t('imagesCount', { current: imageInfoRef.current.length, max: isProUser ? 100 : FREE_USER_IMAGE_LIMIT })}
                            </span>
                            {!isProUser && imageInfoRef.current.length >= FREE_USER_IMAGE_LIMIT && (
                              <span className="text-xs text-gray-600">
                                {t('upgradeFor')}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-sm font-semibold">{status}</p>
                        <p className="text-xs text-gray-500">{t('AIStatusLabel', { status: workerStatus })}</p>
                        {!isCvReady && <p className="text-xs text-yellow-600">{t('QualityAnalyzerStatusLoading')}</p>}
                      </div>
                    </div>
                  </div>

                  {/* New similarity threshold control */}
                  {imageInfoRef.current.length > 0 && pendingFilesCount === 0 && (
                    <div className="brutalist-border p-4 bg-white">
                      <h3 className="font-bold mb-2">{t('SimilarityThresholdTitle')}</h3>
                      <p className="text-sm mb-3">
                        {t('SimilarityThresholdDescription')}
                      </p>
                      <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full">
                          <input
                            type="range"
                            min="0.75"
                            max="0.99"
                            step="0.01"
                            value={similarityThreshold}
                            onChange={handleThresholdChange}
                            className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
                            disabled={isActionDisabled}
                          />
                          <div className="flex justify-between text-xs mt-1">
                            <span>{t('SimilarityLessStrict')}</span>
                            <span>{t('SimilarityCurrent', { threshold: similarityThreshold.toFixed(2) })}</span>
                            <span>{t('SimilarityMoreStrict')}</span>
                          </div>
                        </div>
                        <Button
                          variant="accent"
                          size="sm"
                          disabled={isActionDisabled}
                          onClick={reanalyzeWithNewThreshold}
                        >
                          {processingThresholdChange ? t('ButtonApplyThresholdLoading') : t('ButtonApplyThreshold')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {(duplicateSets.length > 0 || uniqueImageIndices.length > 0) && (
                    <div className="brutalist-border p-6 bg-white mt-6 relative">
                      <h2 className="text-xl font-bold mb-4">{t('ResultsTitle')}</h2>
                      
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
                          <div className="flex flex-wrap justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold">
                              {t('DuplicateSetTitle', { number: groupIndex + 1, count: group.length })}
                            </h3>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAnalyzeQuality(groupIndex)}
                                disabled={!isCvReady || analyzingQualityDirectly !== null || group.length <=1 }
                            >
                                {analyzingQualityDirectly === groupIndex ? t('ButtonAnalyzeQualityLoading') 
                                  : (group.every(idx => !!imageKpis[imageInfoRef.current[idx]?.id]) 
                                    ? t('ButtonReanalyzeQuality') 
                                    : t('ButtonAnalyzeQuality'))}
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {group.map((imageOriginalIndex) => {
                              const image = imageInfoRef.current[imageOriginalIndex];
                              if (!image) {
                                return <p key={`missing-dup-${groupIndex}-${imageOriginalIndex}`}>{t('ImageMissing', { index: imageOriginalIndex })}</p>;
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
                                      {t('BestLabel')}
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
                                      <p className={imageWithKpis.isBestResolution ? "font-bold text-primary" : ""}>{t('KpiRes')} {kpis.resolution.width}x{kpis.resolution.height}</p>
                                      <p className={imageWithKpis.isBestSharpness ? "font-bold text-primary" : ""}>{t('KpiSharp')} {kpis.sharpness.toFixed(2)}</p>
                                      <p className={imageWithKpis.isBestNoise ? "font-bold text-primary" : ""}>{t('KpiNoise')} {kpis.noiseLevel.toFixed(2)}</p>
                                      <p className={imageWithKpis.isBestContrast ? "font-bold text-primary" : ""}>{t('KpiContrast')} {kpis.contrast.toFixed(2)}</p>
                                      <p className={imageWithKpis.isBestExposure ? "font-bold text-primary" : ""}>{t('KpiExposure')} {kpis.exposure.toFixed(2)}</p>
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
                                      {isDownloadingSingleId === imageWithKpis.id ? t('ButtonDownloading') : t('ButtonDownload')}
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
                            {t('UniqueImagesTitle', { count: uniqueImageIndices.length })}
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {uniqueImageIndices.map((imageOriginalIndex, index) => {
                              const image = imageInfoRef.current[imageOriginalIndex];
                              if (!image) {
                                return <p key={`missing-unique-${index}-${imageOriginalIndex}`}>{t('ImageMissing', { index: imageOriginalIndex })}</p>;
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
                                  {/* Add download button for unique images */}
                                  <div className="mt-auto pt-1">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="w-full text-xs py-1 mt-1"
                                      onClick={() => handleDownloadSingleFromGroup(image)}
                                      disabled={isActionDisabled || isDownloadingSingleId === image.id}
                                    >
                                      {isDownloadingSingleId === image.id ? t('ButtonDownloading') : t('ButtonDownload')}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(duplicateSets.length > 0 || uniqueImageIndices.length > 0) && (
                        <div className="sticky bottom-0 left-0 right-0 z-10 bg-white py-4 border-t border-2 border-t-black mt-6">
                          <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                            {!allGroupsAnalyzedForBest ? (
                                <Button 
                                    variant="accent" 
                                    onClick={handleAnalyzeAllGroupsForBest}
                                    disabled={isActionDisabled || (!isCvReady && duplicateSets.length > 0) || pendingFilesCount > 0}
                                    className="w-full max-w-md"
                                >
                                    {isDownloadingAll ? t('ButtonAnalyzeAllGroupsLoading') : t('ButtonAnalyzeAllGroups')}
                                </Button>
                            ) : (
                                <Button 
                                    variant="accent"
                                    onClick={handleDownloadAll}
                                    disabled={isActionDisabled || imagesToDownloadCount === 0}
                                    className="w-full max-w-md"
                                >
                                    {isDownloadingAll 
                                        ? t('ButtonDownloadBestLoading') 
                                        : t('ButtonDownloadBest', { count: imagesToDownloadCount })}
                                </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {imageInfoRef.current.length > 0 && duplicateSets.length === 0 && uniqueImageIndices.length === 0 && !isLoading && (
                     <div className="brutalist-border p-6 bg-white mt-6">
                        <p className="text-center text-gray-600">{t('NoImagesProcessedOrGroups')}</p>
                    </div>
                  )}
                  { /* Show global status or errors related to download all if any */ }
                  {(isDownloadingAll || isDownloadingSingleId) && <p className="text-center text-sm font-bold mt-4">{status}</p>}
                </div>
              </Card>
            </div>
            
            <div className="space-y-6">
              {/* Pro upgrade card for non-pro users */}
              {!isProUser && (
                <Card title={t('UpgradeCardTitle')} variant="accent">
                  <div className="space-y-4 p-1"> {/* Added small padding to match example style if PricingCard has its own internal padding */} 
                    <PricingCard
                      title={t('UpgradeCardPlanTitle')}
                      price={t('UpgradeCardPlanPrice')}
                      isPro={true} // This card represents the Pro plan
                      features={[
                        t('UpgradeCardFeature1'),
                        t('UpgradeCardFeature2'),
                        t('UpgradeCardFeature3'),
                        t('UpgradeCardFeature4'),
                        t('UpgradeCardFeature5'),
                      ]}
                      buttonText={t('UpgradeCardButton')}
                      onSelectPlan={() => router.push('/pricing')}
                    />
                  </div>
                </Card>
              )}
              
              <Card title={t('HowItWorksTitle')} variant="accent">
                <div className="space-y-4">
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">{t('HowItWorksStep1Title')}</h3>
                    <p className="text-sm">
                      {t('HowItWorksStep1Desc')}
                    </p>
                    {!isProUser && (
                      <p className="text-xs mt-1 text-primary font-medium">
                        {t('HowItWorksStep1Free', { limit: FREE_USER_IMAGE_LIMIT })}
                      </p>
                    )}
                    {isProUser && (
                      <p className="text-xs mt-1 text-green-600 font-medium">
                        {t('HowItWorksStep1Pro')}
                      </p>
                    )}
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">{t('HowItWorksStep2Title')}</h3>
                    <p className="text-sm">
                     {t('HowItWorksStep2Desc')}
                    </p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">{t('HowItWorksStep3Title')}</h3>
                    <p className="text-sm">
                      {t('HowItWorksStep3Desc')}
                    </p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">{t('HowItWorksStep4Title')}</h3>
                    <p className="text-sm">
                     {t('HowItWorksStep4Desc')}
                    </p>
                  </div>
                  <div className="brutalist-border p-3 bg-white">
                    <h3 className="font-bold mb-2">{t('HowItWorksStep5Title')}</h3>
                    <p className="text-sm">
                      {t('HowItWorksStep5Desc')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Pro Dialog */}
      {showProDialog && (
        <ProUpgradeDialog
          isOpen={showProDialog}
          onClose={handleCloseProDialog}
          title={t('ProUpgradeTitle')}
          feature={t('ProFeatureName')}
          maxImagesCount={FREE_USER_IMAGE_LIMIT}
        />
      )}
    </main>
  );
} 

