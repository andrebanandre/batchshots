"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
// Pro removed
import { useIsMobile } from "../../hooks/useIsMobile";
import Button from "../../components/Button";
import Card from "../../components/Card";
// Pro badge removed
// Pricing card removed
import { ImageFile } from "../../components/ImagePreview";
import {
  createImageFile,
  processImage,
  downloadImage,
  downloadAllImages,
} from "../../lib/imageProcessing";
import {
  processImageBackground,
  getUpdatedImageWithBackground,
  initializeBackgroundWorker,
  cleanupBackgroundWorker,
} from "../../lib/backgroundRemoval";
import Loader from "../../components/Loader";
import { defaultAdjustments } from "../../components/ImageProcessingControls";
import { useTranslations } from "next-intl";
import { defaultWatermarkSettings } from "@/app/components/WatermarkControl";

// Max dimensions for processing - prevents memory issues on mobile
const MAX_PROCESSING_WIDTH = 1600;
const MAX_PROCESSING_HEIGHT = 1600;
const DELAY_BETWEEN_IMAGES = 500; // ms delay between processing images

// Interface for tracking individual image processing status
interface ImageProcessingStatus {
  id: string;
  isProcessing: boolean;
  progress: number;
  isComplete: boolean;
  error?: string;
}

// Function to resize an image before processing to avoid memory issues
const resizeImageForProcessing = async (
  imageFile: ImageFile
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      const { width, height } = img;

      // If image is small enough, return original
      if (width <= MAX_PROCESSING_WIDTH && height <= MAX_PROCESSING_HEIGHT) {
        fetch(imageFile.dataUrl!)
          .then((res) => res.blob())
          .then(resolve)
          .catch(reject);
        return;
      }

      // Calculate new dimensions while maintaining aspect ratio
      // Based on the highest proportional side (width or height)
      let newWidth = width;
      let newHeight = height;

      // Calculate resize ratios for both dimensions
      const widthRatio = width / MAX_PROCESSING_WIDTH;
      const heightRatio = height / MAX_PROCESSING_HEIGHT;

      // Use the largest ratio to determine which dimension is more "out of bounds"
      if (widthRatio >= heightRatio) {
        // Width is the limiting factor
        newWidth = MAX_PROCESSING_WIDTH;
        newHeight = Math.floor(height / widthRatio);
      } else {
        // Height is the limiting factor
        newHeight = MAX_PROCESSING_HEIGHT;
        newWidth = Math.floor(width / heightRatio);
      }

      // Resize using canvas
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to Blob conversion failed"));
        },
        "image/jpeg",
        0.9
      );
    };

    img.onerror = () => reject(new Error("Image loading failed"));
    img.src = imageFile.dataUrl!;
  });
};

export default function BackgroundRemovalPage() {
  const t = useTranslations("Components.BackgroundRemovalPage");
  const tHome = useTranslations("Home");

  const { isLowPerformanceDevice } = useIsMobile();
  const router = useRouter();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState("");

  // Track processing status for each image
  const [processingStatus, setProcessingStatus] = useState<
    ImageProcessingStatus[]
  >([]);

  // Initialize the worker and model
  useEffect(() => {
    let isMounted = true;

    const initializeModel = async () => {
      if (typeof window === "undefined") return;

      try {
        setIsLoadingModel(true);
        setModelLoadingStatus("Initializing background removal model...");

        await initializeBackgroundWorker();

        if (isMounted) {
          setIsModelReady(true);
          setIsLoadingModel(false);
          console.log("Background removal model initialized successfully");
        }
      } catch (error) {
        console.error("Failed to initialize background removal model", error);
        if (isMounted) {
          setIsLoadingModel(false);
          setModelLoadingStatus(
            "Failed to load model. Please refresh and try again."
          );
        }
      }
    };

    initializeModel();

    return () => {
      isMounted = false;
      cleanupBackgroundWorker();
    };
  }, []);

  // Update processing status for images
  useEffect(() => {
    // Initialize processing status for new images
    if (images.length > 0) {
      setProcessingStatus((prev) => {
        // Keep existing statuses
        const existingStatuses = prev.filter((status) =>
          images.some((img) => img.id === status.id)
        );

        // Add statuses for new images
        const newImageIds = images
          .filter(
            (img) => !existingStatuses.some((status) => status.id === img.id)
          )
          .map((img) => img.id);

        const newStatuses = newImageIds.map((id) => ({
          id,
          isProcessing: false,
          progress: 0,
          isComplete:
            images.find((img) => img.id === id)?.backgroundRemoved || false,
        }));

        return [...existingStatuses, ...newStatuses];
      });
    } else {
      setProcessingStatus([]);
    }
  }, [images]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    let fileArray = Array.from(e.target.files);

    // Limit to 100 images
    if (fileArray.length > 100) {
      alert("Maximum 100 images allowed at once.");
      fileArray = fileArray.slice(0, 100);
    }

    try {
      setIsProcessing(true);
      const newImages = await Promise.all(fileArray.map(createImageFile));
      setImages(newImages);
    } catch (error) {
      console.error("Error processing uploaded files", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process a single image and update its status
  const processImageAndUpdateStatus = async (
    image: ImageFile,
    index: number,
    total: number
  ) => {
    // Update status to processing
    setProcessingStatus((prev) =>
      prev.map((status) =>
        status.id === image.id
          ? { ...status, isProcessing: true, progress: 0 }
          : status
      )
    );

    try {
      // Update overall progress percentage
      setProgressPercent(Math.round((index / total) * 100));

      // For low performance devices, resize large images before processing
      let updatedImage = image;
      if (isLowPerformanceDevice) {
        try {
          const resizedBlob = await resizeImageForProcessing(image);
          console.log(
            `Resized image for processing on low-performance device: ${image.id}`
          );
          // Create a temporary object URL for the resized image
          const resizedUrl = URL.createObjectURL(resizedBlob);
          updatedImage = {
            ...image,
            dataUrl: resizedUrl,
          };
        } catch (resizeError) {
          console.error("Error resizing image:", resizeError);
        }
      }

      // Process image with background removal
      const processedBlob = await processImageBackground(updatedImage);

      // Update status to show progress
      setProcessingStatus((prev) =>
        prev.map((status) =>
          status.id === image.id ? { ...status, progress: 50 } : status
        )
      );

      // Clean up any temporary object URL we created
      if (updatedImage.dataUrl !== image.dataUrl) {
        URL.revokeObjectURL(updatedImage.dataUrl!);
      }

      // Create a new image with the processed data
      const processedImage = getUpdatedImageWithBackground(
        image,
        processedBlob
      );

      // Apply minimal adjustments to the image
      const { processedThumbnailUrl } = await processImage(
        processedImage,
        defaultAdjustments,
        null,
        defaultWatermarkSettings,
        false
      );

      // Update status to complete
      setProcessingStatus((prev) =>
        prev.map((status) =>
          status.id === image.id
            ? {
                ...status,
                isProcessing: false,
                progress: 100,
                isComplete: true,
              }
            : status
        )
      );

      // Replace the original image with the processed one
      setImages((prevImages) =>
        prevImages.map((img) =>
          img.id === image.id
            ? { ...processedImage, processedThumbnailUrl }
            : img
        )
      );

      return { ...processedImage, processedThumbnailUrl };
    } catch (error) {
      console.error(`Error processing image ${image.id}:`, error);

      // Update status to show error
      setProcessingStatus((prev) =>
        prev.map((status) =>
          status.id === image.id
            ? {
                ...status,
                isProcessing: false,
                error: error instanceof Error ? error.message : "Unknown error",
                isComplete: false,
              }
            : status
        )
      );

      return null;
    }
  };

  const handleRemoveBackground = async () => {
    if (images.length === 0) return;

    setIsRemovingBackground(true);

    try {
      // Process each image to remove background
      const processed: ImageFile[] = [];

      // Throttle processing on low performance devices
      const shouldThrottle = isLowPerformanceDevice;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Skip already processed images
        if (image.backgroundRemoved) {
          processed.push(image);
          continue;
        }

        const processedImage = await processImageAndUpdateStatus(
          image,
          i,
          images.length
        );
        if (processedImage) {
          processed.push(processedImage);
        }

        // Add delay between processing images on low-performance devices
        // This gives browser a chance to clean up memory between operations
        if (shouldThrottle && i < images.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_IMAGES)
          );
        }
      }

      setProgressPercent(100);
    } catch (error) {
      console.error("Error in background removal:", error);
      alert("Background removal failed. Please try again.");
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // Handle downloading a single image
  const handleDownloadSingleImage = async (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image || !image.backgroundRemoved || !image.dataUrl) return;

    try {
      setIsDownloading(true);
      await downloadImage(image.dataUrl, image.file.name, "png");
    } catch (error) {
      console.error("Error downloading image:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle downloading all processed images
  const handleDownloadAll = async () => {
    if (images.length === 0) return;

    setIsDownloading(true);

    try {
      // Use existing downloadAllImages function with ZIP for multiple images
      if (images.length > 1) {
        await downloadAllImages(images, "png", true);
      } else if (images.length === 1) {
        // For a single image, just download directly
        const image = images[0];
        if (image.backgroundRemoved && image.dataUrl) {
          await downloadImage(image.dataUrl, image.file.name, "png");
        }
      }
    } catch (error) {
      console.error("Error downloading images:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Get processing status for an image
  const getImageStatus = (imageId: string) => {
    return processingStatus.find((status) => status.id === imageId);
  };

  return (
    <>
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="brutalist-accent-card mb-8">
          <h1 className="text-3xl font-bold text-center uppercase mb-6">
            {t("title")}
          </h1>

          {isLoadingModel || !isModelReady ? (
            <div className="brutalist-border p-4 text-center mb-6 bg-white">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader size="lg" />
                <h3 className="text-lg font-bold mb-2">{t("loading.tool")}</h3>
                <p className="text-sm text-gray-600">
                  {modelLoadingStatus || t("loading.description")}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card
                  collapsible={false}
                  title={t("mainCard.title")}
                  variant="accent"
                  headerRight={null}
                >
                  <div className="space-y-6 relative">
                    {/* Main loading overlay for the entire card */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-30 rounded-md backdrop-blur-sm">
                        <Loader size="lg" />
                        <p className="mt-4 text-lg font-bold text-gray-700">
                          {tHome("preparingImagesPreview")}
                        </p>
                      </div>
                    )}

                    {/* Info Section */}
                    <div className="brutalist-border p-4 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("mainCard.info.title")}
                      </h3>
                      <p className="text-sm mb-2">
                        {t("mainCard.info.description")}
                      </p>
                    </div>

                    {/* Upload and Process Area */}
                    <div className="brutalist-border p-6 bg-white">
                      <div className="space-y-4">
                        {images.length === 0 ? (
                          <div className="text-center">
                            <p className="text-lg font-bold mb-4">
                              {t("mainCard.upload.title")}
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleFileChange}
                              className="hidden"
                              id="fileInput"
                              disabled={isProcessing || isRemovingBackground}
                            />
                            <div className="flex flex-col items-center gap-2 space-y-6">
                              <label
                                htmlFor="fileInput"
                                className="inline-block"
                              >
                                <Button
                                  as="span"
                                  variant="primary"
                                  size="lg"
                                  disabled={
                                    isProcessing || isRemovingBackground
                                  }
                                >
                                  {t("mainCard.upload.buttonPro")}
                                </Button>
                              </label>

                              <span className="text-xs text-gray-600">
                                {t("mainCard.upload.helpTextPro")}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {images.map((image) => {
                                const status = getImageStatus(image.id);
                                return (
                                  <div
                                    key={image.id}
                                    className="brutalist-border p-1 bg-white relative"
                                  >
                                    {image.backgroundRemoved ? (
                                      <div
                                        className="bg-[url('/checkered-bg.png')] bg-repeat relative"
                                        style={{ aspectRatio: "1 / 1" }}
                                      >
                                        <Image
                                          src={
                                            image.thumbnailDataUrl ||
                                            image.dataUrl ||
                                            ""
                                          }
                                          alt={image.file.name}
                                          className="object-contain"
                                          fill
                                        />
                                        {/* Download button for processed images */}
                                        <button
                                          onClick={() =>
                                            handleDownloadSingleImage(image.id)
                                          }
                                          className="absolute bottom-1 right-1 brutalist-border border-2 bg-white text-black text-xs px-2 py-1 hover:translate-y-[-2px] transition-transform"
                                          title="Download this image"
                                        >
                                          ↓
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        className="relative"
                                        style={{ aspectRatio: "1 / 1" }}
                                      >
                                        <Image
                                          src={
                                            image.thumbnailDataUrl ||
                                            image.dataUrl ||
                                            ""
                                          }
                                          alt={image.file.name}
                                          className="object-contain"
                                          fill
                                        />

                                        {/* Show processing status */}
                                        {status?.isProcessing && (
                                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                            <Loader size="sm" />
                                            <span className="text-xs mt-2">
                                              {Math.round(status.progress)}%
                                            </span>
                                          </div>
                                        )}

                                        {/* Show error indicator if processing failed */}
                                        {status?.error && (
                                          <div
                                            className="absolute bottom-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-sm"
                                            title={status.error}
                                          >
                                            !
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <p className="text-xs truncate mt-1 px-1">
                                      {image.file.name}
                                      {image.backgroundRemoved && (
                                        <span
                                          className="ml-1 inline-block w-2 h-2 bg-green-500 rounded-full"
                                          title="Background removed"
                                        ></span>
                                      )}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex justify-between">
                              <Button
                                variant="secondary"
                                onClick={() => setImages([])}
                                disabled={isProcessing || isRemovingBackground}
                              >
                                {t("mainCard.actions.clear")}
                              </Button>
                            </div>

                            {isRemovingBackground && (
                              <div className="space-y-2">
                                <div className="w-full h-3 brutalist-border bg-white overflow-hidden">
                                  <div
                                    className="h-full bg-[#4F46E5]"
                                    style={{ width: `${progressPercent}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>
                                    {t("mainCard.progress.processing")}
                                  </span>
                                  <span>
                                    {t("mainCard.progress.percent", {
                                      percent: progressPercent,
                                    })}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Sticky download button at bottom of container */}
                            {images.some((img) => img.backgroundRemoved) &&
                              images.length > 1 && (
                                <div className="sticky bottom-0 left-0 right-0 z-10 bg-white py-4 border-t border-2 border-t-black mt-6">
                                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                                    <Button
                                      variant="accent"
                                      onClick={handleDownloadAll}
                                      disabled={
                                        isProcessing ||
                                        isRemovingBackground ||
                                        isDownloading
                                      }
                                      className="w-full max-w-md"
                                    >
                                      {isDownloading ? (
                                        <span className="flex items-center justify-center">
                                          <Loader size="sm" className="mr-2" />
                                          {t("mainCard.actions.downloadingZip")}
                                        </span>
                                      ) : (
                                        t("mainCard.actions.downloadZip")
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}

                            {/* Sticky remove background button at bottom of container */}
                            {images.length > 0 &&
                              !images.some((img) => img.backgroundRemoved) && (
                                <div className="sticky bottom-0 left-0 right-0 z-10 bg-white py-4 border-t border-2 border-t-black mt-6">
                                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                                    <Button
                                      variant="accent"
                                      onClick={handleRemoveBackground}
                                      disabled={
                                        isProcessing || isRemovingBackground
                                      }
                                      className="w-full max-w-md"
                                    >
                                      {isRemovingBackground ? (
                                        <span className="flex items-center justify-center">
                                          <Loader size="sm" className="mr-2" />
                                          {t(
                                            images.length > 1
                                              ? "mainCard.actions.processingMultiple"
                                              : "mainCard.actions.processing"
                                          )}
                                        </span>
                                      ) : (
                                        t(
                                          images.length > 1
                                            ? "mainCard.actions.removeBackgrounds"
                                            : "mainCard.actions.removeBackground"
                                        )
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Upgrade card removed */}

                <Card title={t("howItWorks.title")} variant="accent">
                  <div className="space-y-4">
                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("howItWorks.step1.title")}
                      </h3>
                      <p className="text-sm">
                        {t("howItWorks.step1.description")}
                        {` ${t("howItWorks.step1.proNote")}`}
                      </p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("howItWorks.step2.title")}
                      </h3>
                      <p className="text-sm">
                        {t("howItWorks.step2.description")}
                      </p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("howItWorks.step3.title")}
                      </h3>
                      <p className="text-sm">
                        {t("howItWorks.step3.description")}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Pro Upgrade Dialog */}
        {showProUpgrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white brutalist-border border-3 border-black p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{t("proDialog.title")}</h3>
                <button
                  onClick={() => setShowProUpgrade(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <span className="font-bold">
                    {t("proDialog.featureTitle")}
                  </span>
                </div>

                <p className="mb-4 text-sm">{t("proDialog.description")}</p>

                <div className="brutalist-border p-3 bg-yellow-50 mb-4">
                  <p className="font-bold text-center mb-2">
                    {t("proDialog.pricing.title")}
                  </p>
                  <p className="text-3xl font-bold text-center">
                    {t("proDialog.pricing.price")}
                  </p>
                  <p className="text-center text-sm text-gray-600">
                    {t("proDialog.pricing.note")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  variant="primary"
                  onClick={() => router.push("/pricing")}
                  className="w-full"
                >
                  {t("proDialog.actions.upgrade")}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowProUpgrade(false);
                    // Process only the first image for free users
                    setImages([images[0]]);
                  }}
                  className="w-full"
                >
                  {t("proDialog.actions.continue")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
