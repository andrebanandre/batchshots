"use client";

import { useEffect, useState, useRef, ChangeEvent } from 'react';
import NextImage from 'next/image'; // Aliased import
import Button from '../../components/Button';
import Card from '../../components/Card';
import Loader from '../../components/Loader';
import { isHeicFormat, convertHeicToFormat } from '../../utils/imageFormatConverter'; // Added HEIC utilities
import JSZip from 'jszip'; // Import JSZip
import slug from 'slug'; // Import slug
import { useIsPro } from '../../hooks/useIsPro'; // Added
import ProDialog from '../../components/ProDialog'; // Added
import ProBadge from '../../components/ProBadge'; // Added
import PricingCard from '../../components/PricingCard'; // Added PricingCard import
import { useRouter } from 'next/navigation'; // Added
import { useLocale, useTranslations } from 'next-intl'; // Added useTranslations

interface ImageInfo {
  id: string; // Unique ID for this image instance for worker communication
  name: string;
  size: number;
  type: string;
  url: string;
  originalIndex: number; // To maintain order when collecting results
}

interface ImageSeoData {
  baseAIDescription: string; // Raw AI output
  description: string; // AI output + keywords
  seoName: string;
}

interface ProcessedImage extends ImageInfo {
  seoData?: ImageSeoData;
  error?: string;
}

export default function ImageSeoGenerationPage() {
  // Placeholder for translations - replace with useTranslations if needed later
  const t = useTranslations('ImageSeoGenerationPage');

  const { isProUser, isLoading: isProLoading } = useIsPro();
  const router = useRouter();
  const locale = useLocale();

  const [showProUpgradeDialog, setShowProUpgradeDialog] = useState<boolean>(false);

  const MAX_IMAGES_FREE = 3;
  const MAX_IMAGES_PRO = 100; // Represents "unlimited" for practical purposes

  const [status, setStatus] = useState<string>(t('AppInitializing'));
  const [workerStatus, setWorkerStatus] = useState<string>(t('AISetup'));
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [pendingFilesCount, setPendingFilesCount] = useState<number>(0);
  const [customKeywords, setCustomKeywords] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false); // New state for regeneration
  
  const imageInfoRef = useRef<ImageInfo[]>([]);
  const activeKeywordsRef = useRef<string>(''); // To store keywords at the time of processing
  const workerRef = useRef<Worker | null>(null);
  // Stores results from the worker: imageId -> ImageSeoData
  const resultsMapRef = useRef<Record<string, ImageSeoData | { error: string }>>({});

  // Effect to load keywords from localStorage on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKeywords = localStorage.getItem('imageSeoKeywords');
      if (storedKeywords) {
        setCustomKeywords(storedKeywords);
      }
    }
  }, []); // Empty array means this runs once on mount

  // Effect to save keywords to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('imageSeoKeywords', customKeywords);
    }
  }, [customKeywords]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const workerInstance = new Worker(new URL('./image-captioning.worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current = workerInstance;
    setWorkerStatus(t('AIEngineInitializing'));
    workerInstance.postMessage({ type: 'load' });

    workerInstance.onmessage = (event: MessageEvent) => {
      const { status: workerMsgStatus, data, imageId, description, seoName } = event.data;
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
          // console.log('Main: Worker loading progress:', data);
          break;
        case 'processing':
          setStatus(t('ProcessingImage', { imageId }));
          break;
        case 'generation_complete': {
          const baseAIDescription = description; // Received from worker
          let finalDescription = baseAIDescription;
          let finalSeoName = seoName; // Initial seoName from worker is based on baseAIDescription
          
          const keywordsForInitialBatch = activeKeywordsRef.current;

          if (keywordsForInitialBatch.trim() !== '') {
            const keywordsArray = keywordsForInitialBatch.split(',').map(k => k.trim()).filter(k => k !== '');
            if (keywordsArray.length > 0) {
              const numKeywordsToSelect = Math.floor(Math.random() * Math.min(3, keywordsArray.length)) + 1;
              const shuffledKeywords = [...keywordsArray].sort(() => 0.5 - Math.random());
              const selectedKeywords = shuffledKeywords.slice(0, numKeywordsToSelect);
              const keywordString = selectedKeywords.join(' ');

              if (Math.random() < 0.5) { // Prepend
                finalDescription = `${keywordString} ${baseAIDescription}`;
              } else { // Append
                finalDescription = `${baseAIDescription} ${keywordString}`;
              }
              finalSeoName = slug(finalDescription, { lower: true }).substring(0, 70);
            }
          }
          resultsMapRef.current[imageId] = { baseAIDescription, description: finalDescription, seoName: finalSeoName };
          setPendingFilesCount(prevCount => prevCount - 1);
          break;
        }
        case 'error':
          if (imageId) {
            resultsMapRef.current[imageId] = { error: data };
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
    
    return () => {
      workerRef.current?.terminate();
      imageInfoRef.current.forEach(info => URL.revokeObjectURL(info.url));
    };
  }, []); // Removed customKeywords from dependency array

  useEffect(() => {
    if (imageInfoRef.current.length > 0 && pendingFilesCount === 0 && !isRegenerating) { // Ensure not to conflict with regeneration
        const allProcessed: ProcessedImage[] = imageInfoRef.current.map(info => {
            const result = resultsMapRef.current[info.id];
            if (result && 'description' in result) {
                return { ...info, seoData: result };
            }
            return { ...info, error: (result && 'error' in result) ? result.error : 'Processing incomplete or error unknown' };
        });
        setProcessedImages(allProcessed);
        setStatus(t('AllImagesProcessed'));
    }
  }, [pendingFilesCount]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const inputFiles = event.target.files ? Array.from(event.target.files) : [];
    if (inputFiles.length === 0) {
      setStatus(t('PleaseSelectImages'));
      return;
    }
    activeKeywordsRef.current = customKeywords;

    if (isProLoading) {
        setStatus("Checking user plan..."); // Or some other appropriate message
        return;
    }

    if (!workerRef.current || workerStatus !== t('AIReady')) {
      setStatus(t('AINotReadyError'));
      return;
    }

    setStatus(t('ProcessingFilesHEIC'));
    const processedInputFiles: File[] = [];
    for (const inputFile of inputFiles) {
      if (await isHeicFormat(inputFile)) {
        console.log(`Main: Detected HEIC file: ${inputFile.name}. Attempting conversion to PNG.`);
        try {
            const convertedFile = await convertHeicToFormat(inputFile, 'png'); // Convert to PNG
            if (convertedFile) {
                processedInputFiles.push(convertedFile);
                console.log(`Main: Successfully converted ${inputFile.name} to ${convertedFile.name}.`);
            } else {
                console.warn(`Main: Failed to convert HEIC file: ${inputFile.name}. Skipping this file.`);
                setStatus(t('HEICConversionFailedSkip', { fileName: inputFile.name }));
            }
        } catch (conversionError) {
            console.error(`Main: Error during HEIC conversion for ${inputFile.name}:`, conversionError);
            setStatus(t('HEICConversionErrorSkip', { fileName: inputFile.name }));
        }
      } else if (inputFile.type.startsWith('image/')) { // Only add other valid image types
        processedInputFiles.push(inputFile);
      } else {
        console.warn(`Main: Skipping non-image file: ${inputFile.name}, type: ${inputFile.type}`);
      }
    }

    let filesToProcessThisBatch = processedInputFiles;
    const effectiveMaxImages = isProUser ? MAX_IMAGES_PRO : MAX_IMAGES_FREE;

    if (processedInputFiles.length > effectiveMaxImages) {
        if (!isProUser) {
            setShowProUpgradeDialog(true);
            filesToProcessThisBatch = processedInputFiles.slice(0, MAX_IMAGES_FREE);
            setStatus(t('FreeLimitReachedSomeProcessed', { count: MAX_IMAGES_FREE }));
        } else { // Pro user hitting their (high) limit
            filesToProcessThisBatch = processedInputFiles.slice(0, MAX_IMAGES_PRO);
            setStatus(t('ProLimitReachedSomeProcessed', { count: MAX_IMAGES_PRO }));
        }
    }
    
    if (filesToProcessThisBatch.length === 0) {
      setStatus(processedInputFiles.length > 0 ? t('NoValidFilesToProcessAfterLimit') : t('NoValidFilesAfterConversion'));
      if (event.target) event.target.value = ''; // Reset file input
      return;
    }
    
    imageInfoRef.current.forEach(info => URL.revokeObjectURL(info.url));
    imageInfoRef.current = [];
    resultsMapRef.current = {};
    setProcessedImages([]);
    
    const newImageInfos: ImageInfo[] = filesToProcessThisBatch.map((file, index) => ({
      id: String(index), // Simple ID based on index for this batch
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      originalIndex: index,
    }));
    
    imageInfoRef.current = newImageInfos;

    if (newImageInfos.length > 0) {
      setPendingFilesCount(newImageInfos.length);
      setStatus(t('SendingImagesToAI', { count: newImageInfos.length }));
      newImageInfos.forEach((info) => {
        workerRef.current?.postMessage({
          type: 'generateCaption',
          data: { imageUrl: info.url, imageId: info.id }
        });
      });
    } else {
      setStatus(t('NoValidFiles'));
    }
    // Reset file input to allow re-selection of the same file(s)
    if (event.target) {
        event.target.value = '';
    }
  };
  
  const isLoading = workerStatus !== t('AIReady') || pendingFilesCount > 0 || isDownloading || isRegenerating || isProLoading;

  const handleRegenerateDescriptions = () => {
    if (!processedImages.some(img => img.seoData?.baseAIDescription)) {
        setStatus("No base descriptions available to regenerate."); // Should not happen if button is enabled correctly
        return;
    }
    setIsRegenerating(true);
    setStatus(t('RegeneratingStatus'));

    const newKeywords = customKeywords; // Current keywords from the input field
    const updatedResults: Record<string, ImageSeoData | { error: string }> = {};
    const newProcessedImages: ProcessedImage[] = [];

    for (const imageInfo of imageInfoRef.current) {
        const existingResult = resultsMapRef.current[imageInfo.id];
        if (existingResult && 'baseAIDescription' in existingResult && existingResult.baseAIDescription) {
            let finalDescription = existingResult.baseAIDescription;
            let finalSeoName = slug(finalDescription, { lower: true }).substring(0, 70);

            if (newKeywords.trim() !== '') {
                const keywordsArray = newKeywords.split(',').map(k => k.trim()).filter(k => k !== '');
                if (keywordsArray.length > 0) {
                    const numKeywordsToSelect = Math.floor(Math.random() * Math.min(3, keywordsArray.length)) + 1;
                    const shuffledKeywords = [...keywordsArray].sort(() => 0.5 - Math.random());
                    const selectedKeywords = shuffledKeywords.slice(0, numKeywordsToSelect);
                    const keywordString = selectedKeywords.join(' ');

                    if (Math.random() < 0.5) {
                        finalDescription = `${keywordString} ${existingResult.baseAIDescription}`;
                    } else {
                        finalDescription = `${existingResult.baseAIDescription} ${keywordString}`;
                    }
                    finalSeoName = slug(finalDescription, { lower: true }).substring(0, 70);
                }
            }
            const updatedSeoData: ImageSeoData = {
                baseAIDescription: existingResult.baseAIDescription,
                description: finalDescription,
                seoName: finalSeoName,
            };
            updatedResults[imageInfo.id] = updatedSeoData;
            newProcessedImages.push({ ...imageInfo, seoData: updatedSeoData });
        } else if (existingResult && 'error' in existingResult) {
            updatedResults[imageInfo.id] = existingResult; // Keep error
            newProcessedImages.push({ ...imageInfo, error: existingResult.error });
        } else {
            // Should not happen if imageInfoRef is in sync with resultsMapRef
            newProcessedImages.push({ ...imageInfo, error: "Original processing data missing." });
        }
    }

    resultsMapRef.current = updatedResults;
    setProcessedImages(newProcessedImages);
    setStatus(t('RegenerationComplete'));
    setIsRegenerating(false);
  };

  // Helper to get file extension
  const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 1);
  };

  const handleDownloadAll = async () => {
    const imagesToDownload = processedImages.filter(img => img.seoData && !img.error);
    if (imagesToDownload.length === 0) {
      setStatus(t('NoFilesToDownload'));
      return;
    }

    setIsDownloading(true);
    setStatus(t('PreparingDownload'));

    const zip = new JSZip();
    let metadataCsv = 'filename,description\n'; // CSV header

    // Add images to zip
    for (const image of imagesToDownload) {
      if (image.seoData && image.url) {
        try {
          const originalExtension = getFileExtension(image.name) || 'png';
          const newFilename = `${image.seoData.seoName}.${originalExtension}`;

          const response = await fetch(image.url); // image.url is the blob URL
          const imageBlob = await response.blob();
          zip.file(newFilename, imageBlob);

          metadataCsv += `"${newFilename.replace(/"/g, '""')}","${image.seoData.description.replace(/"/g, '""')}"\n`;
        } catch (error) {
          console.error(`Error processing image ${image.name} for zipping:`, error);
          // Optionally, notify user about this specific image failing
        }
      }
    }

    // Add metadata.csv to the zip
    zip.file('metadata.csv', metadataCsv);

    try {
      setStatus(t('ZippingFiles', { count: Object.keys(zip.files).length }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `image_seo_results_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setStatus(t('DownloadComplete'));
    } catch (error) {
      console.error("Error generating ZIP file:", error);
      setStatus(t('ErrorCreatingZIP'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-2">
          {isProUser ? t('PageTitlePro') : t('PageTitleFree')}
        </h1>
        {!isProLoading && isProUser && (
          <div className="flex justify-center mb-4">
            <ProBadge />
          </div>
        )}

        {workerStatus === t('AISetup') || workerStatus === t('AIEngineInitializing') || isProLoading ? (
          <div className="brutalist-border p-4 text-center mb-6 bg-white">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader size="lg" />
              <h3 className="text-lg font-bold mb-2">
                {isProLoading ? "Checking your plan..." : workerStatus.includes("Loading Model") ? "Loading AI Model..." : "Initializing AI Engine..."}
              </h3>
              <p className="text-sm text-gray-600">
                {isProLoading ? "Please wait a moment." : workerStatus.includes("Loading Model") ? "The AI model is being downloaded and prepared. This might take a moment, especially on the first visit." : "Please wait while the AI engine starts up."}
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
                      {t('UploadSectionDescriptionWithLimit', { maxImages: isProUser ? MAX_IMAGES_PRO : MAX_IMAGES_FREE })}
                    </p>

                    {/* New Plan Info Box Section */}
                    {!isProLoading && !isProUser && (
                      <div className="bg-yellow-50 p-3 mb-3 brutalist-border">
                        <p className="text-sm font-bold flex items-center">
                          {t('FreePlanInfoBoxTitle')}
                        </p>
                        <p className="text-xs">
                          {t('FreeUserPlanIndicator', { maxImages: MAX_IMAGES_FREE })}
                        </p>
                      </div>
                    )}
                    {!isProLoading && isProUser && (
                      <div className="bg-yellow-50 p-3 mb-3 brutalist-border">
                        <p className="text-sm font-bold flex items-center">
                          {t('ProUserCardTitle')} <ProBadge className="ml-2" />
                        </p>
                        <p className="text-xs">
                          {t('ProUserCardDescription', { maxImages: MAX_IMAGES_PRO })}
                        </p>
                      </div>
                    )}
                    {/* End New Plan Info Box Section */}
                                        
                    <div className="flex flex-col items-center space-y-8 w-full py-4">
                      <div className="flex flex-col items-center justify-center w-full space-y-4 max-w-sm">
                        <label htmlFor="fileInput" className="w-full flex justify-center">
                          <Button as="span" variant="primary" size="lg" className="w-full max-w-xs text-center" disabled={isLoading}>
                            {isLoading ? t('ButtonSelectImagesLoading') : t('ButtonSelectImages')}
                          </Button>
                        </label>
                      </div>
                      
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        id="fileInput"
                        disabled={isLoading}
                      />
                      
                      <div className="flex flex-col items-center space-y-3 w-full">
                        <p className="text-sm font-semibold">{t('StatusLabel')} {status}</p>
                        <p className="text-xs text-gray-500">{t('AIStatusLabel', { status: workerStatus })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Keywords Input Section */}
                  <div className="brutalist-border p-4 bg-white">
                    <h3 className="font-bold mb-2">{t('KeywordsSectionTitle')}</h3>
                    <p className="text-sm mb-3">
                      {t('KeywordsSectionDescription')}
                    </p>
                    <textarea
                      value={customKeywords}
                      onChange={(e) => setCustomKeywords(e.target.value)}
                      placeholder={t('KeywordsPlaceholder')}
                      rows={3}
                      className="w-full p-2 text-sm border brutalist-border-small bg-white rounded-none focus:ring-2 focus:ring-black focus:border-black"
                      disabled={isLoading}
                    />
                    {processedImages.length > 0 && pendingFilesCount === 0 && !isDownloading && (
                        <Button
                            variant="secondary" // Or another appropriate variant
                            size="sm"
                            className="mt-3 w-full md:w-auto"
                            onClick={handleRegenerateDescriptions}
                            disabled={isLoading} // isRegenerating is part of isLoading
                        >
                            {isRegenerating ? t('ButtonRegenerating') : t('ButtonRegenerateWithKeywords')}
                        </Button>
                    )}
                  </div>

                  {processedImages.length > 0 && (
                    <div className="brutalist-border p-6 bg-white mt-6 relative">
                      <div className="space-y-6">
                        {processedImages.map((image) => (
                          <div key={image.id} className="brutalist-border p-4 bg-gray-50 md:flex md:gap-4">
                            <div className="md:w-1/3 mb-4 md:mb-0">
                              <div className="relative w-full" style={{paddingBottom: '75%'}}> {/* Aspect ratio 4:3 */}
                                <NextImage
                                  src={image.url}
                                  alt={image.name}
                                  fill
                                  className="rounded object-contain border border-gray-300"
                                />
                              </div>
                              <p className="text-xs truncate mt-1 px-1 text-center" title={image.name}>{image.name}</p>
                            </div>
                            <div className="md:w-2/3 space-y-2">
                              {image.error ? (
                                <p className='text-red-500'>Error: {image.error}</p>
                              ) : image.seoData ? (
                                <>
                                  <div>
                                    <h4 className="font-semibold text-sm">{t('GeneratedSeoName')}</h4>
                                    <input type="text" readOnly value={image.seoData.seoName} className="w-full p-1.5 text-sm border brutalist-border-small bg-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{t('GeneratedDescription')}</h4>
                                    <textarea readOnly value={image.seoData.description} rows={3} className="w-full p-1.5 text-sm border brutalist-border-small bg-white" />
                                  </div>
                                </>
                              ) : (
                                <p>Processing...</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {processedImages.filter(img => img.seoData && !img.error).length > 0 && (
                        <div className="sticky bottom-0 left-0 right-0 z-10 bg-white py-4 border-t border-2 border-t-black mt-6">
                          <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                            <Button 
                                variant="accent"
                                onClick={handleDownloadAll}
                                disabled={isLoading}
                                className="w-full max-w-md" // Consistent styling
                            >
                                {isDownloading ? t('ButtonDownloadingAll') : t('ButtonDownloadAll')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {imageInfoRef.current.length > 0 && processedImages.length === 0 && !isLoading && (
                     <div className="brutalist-border p-6 bg-white mt-6">
                        <p className="text-center text-gray-600">{t('NoResultsYet')}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            <div className="space-y-6">
              {!isProLoading && !isProUser && (
                <Card title={t('UpgradeToProCardTitle')} variant="accent">
                  <div className="space-y-4 p-1">
                    <PricingCard
                      title={t('UpgradeToProCardTitle')} // This could be a more specific plan title if needed
                      price="$19.99" // Assuming price is fixed, or fetch dynamically
                      isPro={true} // This card represents an upgrade to Pro
                      features={[
                        // It's better to have dedicated translation keys for these features
                        // For now, I'll use placeholders, assuming you'll add them to en.json
                        // e.g., t('ProFeature1_SeoPage'), t('ProFeature2_SeoPage'), etc.
                        `Process up to ${MAX_IMAGES_PRO} images with AI SEO`,
                        "Unlock all AI SEO generation features",
                        "Priority AI processing",
                        "Download results in convenient ZIP format",
                        "Access to all other PRO features"
                      ]}
                      buttonText={t('ButtonUpgradeNow')}
                      onSelectPlan={() => router.push(`/${locale}/pricing`)}
                      isCurrentPlan={false} // Corrected prop name
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
                </div>
              </Card>

              {!isProLoading && (
                <>
                  {isProUser ? (
                    <Card title={t('ProUserCardTitle')} variant="accent">
                      <div className="space-y-2">
                        <div className="brutalist-border p-3 bg-white">
                          <p className="text-sm">
                            {t('ProUserCardDescription', { maxImages: MAX_IMAGES_PRO })}
                          </p>
                        </div>
                        {/* Add more pro benefits if needed */}
                      </div>
                    </Card>
                  ) : (
                    null 
                  )}
                </>
              )}

            </div>
          </div>
        )}
      </div>
      {showProUpgradeDialog && (
        <ProDialog
          featureName={t('ImageUploadFeatureName')}
          featureLimit={MAX_IMAGES_FREE}
          onClose={() => setShowProUpgradeDialog(false)}
          onUpgrade={() => {
            router.push(`/${locale}/pricing`);
            setShowProUpgradeDialog(false);
          }}
        />
      )}
    </main>
  );
} 