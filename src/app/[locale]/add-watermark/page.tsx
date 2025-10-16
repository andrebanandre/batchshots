"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
// Pro removed
import Button from "../../components/Button";
import Card from "../../components/Card";
import ToolPageWrapper from "../../components/ToolPageWrapper";
// Pro badge removed
// Pricing card removed
import { ImageFile } from "../../components/ImagePreview";
import type { HowItWorksStep } from "../../components/HowItWorksSidebar";
import {
  createImageFile,
  processImage,
  downloadImage,
  downloadAllImages,
} from "../../lib/imageProcessing";
import Loader from "../../components/Loader";
import { useTranslations } from "next-intl";
import WatermarkControl, {
  defaultWatermarkSettings,
  WatermarkSettings,
} from "@/app/components/WatermarkControl";
import { ImageProcessingProvider } from "@/app/contexts/ImageProcessingContext";
import { defaultAdjustments } from "@/app/components/ImageProcessingControls";

// Extend ImageFile type to include watermark properties
interface WatermarkedImageFile extends ImageFile {
  hasWatermark?: boolean;
}

export default function AddWatermarkPage() {
  const t = useTranslations("WatermarkPage");
  const tHome = useTranslations("Home");
  const router = useRouter();
  const [images, setImages] = useState<WatermarkedImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  // Upgrade dialog removed
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(
    defaultWatermarkSettings
  );
  const [applyToAll, setApplyToAll] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const imagesRef = useRef<WatermarkedImageFile[]>([]);
  const lastAppliedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Create a stable signature from settings and image ids to avoid reprocessing the same input
  const makeSignature = useCallback(
    (settings: WatermarkSettings, imgs: WatermarkedImageFile[]) => {
      const ids = imgs.map((i) => i.id);
      // Only include fields from settings that affect rendering; assume settings is JSON-serializable
      const settingsString = JSON.stringify(settings);
      return `${settingsString}|${ids.join(",")}`;
    },
    []
  );

  // Select the first image by default when images are loaded
  useEffect(() => {
    if (images.length > 0 && !selectedImageId) {
      setSelectedImageId(images[0].id);
    }
  }, [images, selectedImageId]);

  // Process watermark when settings change - no debounce, immediate processing
  const processWatermark = useCallback(
    async (
      settings: WatermarkSettings,
      sourceImages: WatermarkedImageFile[]
    ) => {
      if (!sourceImages || sourceImages.length === 0) return;

      // No pro gating

      setIsProcessing(true);

      try {
        // Process each image to add watermark
        const processed: WatermarkedImageFile[] = [];
        for (let i = 0; i < sourceImages.length; i++) {
          const image = sourceImages[i];

          // Update progress percentage
          setProgressPercent(Math.round((i / sourceImages.length) * 100));

          // Apply watermark to the image
          const { processedDataUrl, processedThumbnailUrl } =
            await processImage(
              image,
              defaultAdjustments,
              null,
              settings,
              false
            );

          // Add to processed images
          processed.push({
            ...image,
            dataUrl: processedDataUrl || image.dataUrl, // Use original if processedDataUrl is undefined
            processedThumbnailUrl,
            hasWatermark: true,
          });
        }

        setProgressPercent(100);
        setImages(processed); // Replace original images with processed ones
      } catch (error) {
        console.error("Error applying watermark:", error);
        alert(t("alerts.watermarkFailed"));
      } finally {
        setIsProcessing(false);
      }
    },
    [t]
  );

  // Apply watermark whenever settings change
  useEffect(() => {
    if (!watermarkSettings.enabled) return;
    if (images.length === 0) return;
    if (isProcessing) return;

    const signature = makeSignature(watermarkSettings, imagesRef.current);
    if (lastAppliedSignatureRef.current === signature) {
      return; // Already applied for this settings + image set
    }

    // Use ref to avoid effect dependency on images object identity
    void (async () => {
      await processWatermark(watermarkSettings, imagesRef.current);
      // Record signature after successful processing to prevent immediate re-run
      lastAppliedSignatureRef.current = signature;
    })();
    // Intentionally depend only on images.length to avoid reprocessing on identity changes
  }, [
    watermarkSettings,
    images.length,
    isProcessing,
    processWatermark,
    makeSignature,
  ]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    let fileArray = Array.from(e.target.files);

    // Limit to 100 images
    if (fileArray.length > 100) {
      alert(t("alerts.maxImagesLimit"));
      fileArray = fileArray.slice(0, 100);
    }

    try {
      setIsProcessing(true);
      // Reset selected image ID when uploading new images
      setSelectedImageId(null);
      const newImages = await Promise.all(fileArray.map(createImageFile));
      setImages(newImages);
    } catch (error) {
      console.error("Error processing uploaded files", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (images.length === 0) return;

    // Use existing downloadAllImages function with ZIP for multiple images
    if (images.length > 1) {
      downloadAllImages(images, "jpg", true);
    } else if (images.length === 1) {
      // For a single image, just download directly
      const image = images[0];
      if (image.dataUrl) {
        downloadImage(image.dataUrl, image.file.name, "jpg");
      }
    }
  };

  const handleReset = () => {
    setWatermarkSettings(defaultWatermarkSettings);
  };

  const handleTryMain = () => {
    router.push("/");
  };

  // Get the currently selected image
  const selectedImage = selectedImageId
    ? images.find((img) => img.id === selectedImageId)
    : images.length > 0
    ? images[0]
    : null;

  // Prepare How It Works steps
  const howItWorksSteps: HowItWorksStep[] = [
    {
      title: t("howItWorks.step1.title"),
      description: t("howItWorks.step1.description"),
    },
    {
      title: t("howItWorks.step2.title"),
      description: t("howItWorks.step2.description"),
    },
    {
      title: t("howItWorks.step3.title"),
      description: t("howItWorks.step3.description"),
    },
  ];

  return (
    <ToolPageWrapper
      title={t("title")}
      howItWorksSteps={howItWorksSteps}
      howItWorksTitle={t("howItWorks.title")}
    >
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

                    {/* Pro/Free banners removed */}
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
                            disabled={isProcessing}
                          />
                          <div className="flex flex-col items-center gap-2 space-y-6">
                            <label htmlFor="fileInput" className="inline-block">
                              <Button
                                as="span"
                                variant="primary"
                                size="lg"
                                disabled={isProcessing}
                              >
                                {t("mainCard.upload.buttonFree")}
                              </Button>
                            </label>

                            <span className="text-xs text-gray-600">
                              {t("mainCard.upload.helpTextFree")}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Image Preview - New Section */}
                          {selectedImage && (
                            <div className="brutalist-border p-4 bg-white mb-4">
                              <h3 className="font-bold mb-3">
                                {t("preview.title")}
                              </h3>
                              <div
                                className="relative w-full"
                                style={{ height: "400px" }}
                              >
                                <Image
                                  src={
                                    selectedImage.processedThumbnailUrl ||
                                    selectedImage.thumbnailDataUrl ||
                                    selectedImage.dataUrl ||
                                    ""
                                  }
                                  alt={selectedImage.file.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <p className="text-xs text-center mt-2 text-gray-600">
                                {selectedImage.file.name}
                              </p>
                            </div>
                          )}

                          {/* Image Thumbnails */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {images.map((image) => (
                              <div
                                key={image.id}
                                className={`brutalist-border p-1 bg-white ${
                                  selectedImageId === image.id
                                    ? "ring-2 ring-blue-500"
                                    : ""
                                }`}
                                onClick={() => setSelectedImageId(image.id)}
                                style={{ cursor: "pointer" }}
                              >
                                <div
                                  className="relative"
                                  style={{ aspectRatio: "1 / 1" }}
                                >
                                  <Image
                                    src={
                                      image.processedThumbnailUrl ||
                                      image.thumbnailDataUrl ||
                                      image.dataUrl ||
                                      ""
                                    }
                                    alt={image.file.name}
                                    className="object-contain"
                                    fill
                                  />
                                </div>
                                <p className="text-xs truncate mt-1 px-1">
                                  {image.file.name}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between">
                            <Button
                              variant="secondary"
                              onClick={() => setImages([])}
                              disabled={isProcessing}
                            >
                              {t("mainCard.actions.clear")}
                            </Button>

                            <Button
                              variant="accent"
                              onClick={handleDownload}
                              disabled={
                                isProcessing ||
                                !images.some((img) => img.hasWatermark)
                              }
                            >
                              {t(
                                images.length > 1
                                  ? "mainCard.actions.downloadZip"
                                  : "mainCard.actions.download"
                              )}
                            </Button>
                          </div>

                          {isProcessing && (
                            <div className="space-y-2">
                              <div className="w-full h-3 brutalist-border bg-white overflow-hidden">
                                <div
                                  className="h-full bg-[#4F46E5]"
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>{t("mainCard.progress.processing")}</span>
                                <span>
                                  {t("mainCard.progress.percent", {
                                    percent: progressPercent,
                                  })}
                                </span>
                              </div>
                            </div>
                          )}

                          {images.some((img) => img.hasWatermark) && (
                            <div className="mt-6">
                              <Button
                                variant="default"
                                onClick={handleTryMain}
                                fullWidth
                              >
                                {t("mainCard.actions.tryFullEditor")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watermark Control Section */}
                  {images.length > 0 && (
                    <ImageProcessingProvider
                      adjustments={defaultAdjustments}
                      onAdjustmentsChange={() => {}}
                      watermarkSettings={watermarkSettings}
                      onWatermarkSettingsChange={setWatermarkSettings}
                      applyToAll={applyToAll}
                      setApplyToAll={setApplyToAll}
                      onReset={handleReset}
                      isProcessing={isProcessing}
                    >
                      <WatermarkControl className="w-full" />
                    </ImageProcessingProvider>
                  )}
                </div>
              </Card>
    </ToolPageWrapper>
  );
}
