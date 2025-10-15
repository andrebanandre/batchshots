"use client";

import React, { useEffect, useState, useCallback } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Loader from "../../components/Loader";
import ModelLoadingCard from "../../components/ModelLoadingCard";
import ImageUploadDropzone from "../../components/ImageUploadDropzone";
import { createImageFile } from "../../lib/imageProcessing";
import type { ImageFile } from "../../components/ImagePreview";
import {
  captionImage,
  initializeCaptionWorker,
  cleanupCaptionWorker,
} from "../../lib/imageCaptioning";
import { useTranslations } from "next-intl";

interface ImageCaptionStatus {
  id: string;
  caption: string;
  isProcessing: boolean;
  error?: string;
}

export default function ImageCaptionGenerationPage() {
  const t = useTranslations("ImageSeoGenerationPage");

  const [images, setImages] = useState<ImageFile[]>([]);
  const [statusById, setStatusById] = useState<
    Record<string, ImageCaptionStatus>
  >({});
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState("");
  const [modelError, setModelError] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setIsLoadingModel(true);
        setModelError(undefined);
        await initializeCaptionWorker();
        if (mounted) {
          setIsModelReady(true);
          setModelLoadingStatus("Model loaded successfully");
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setModelError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (mounted) setIsLoadingModel(false);
      }
    };
    init();
    return () => {
      mounted = false;
      cleanupCaptionWorker();
    };
  }, []);

  const handleSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    const created = await Promise.all(selected.map((f) => createImageFile(f)));
    setImages((prev) => [...prev, ...created]);
    const initialStatus: Record<string, ImageCaptionStatus> = {};
    for (const img of created) {
      initialStatus[img.id] = { id: img.id, caption: "", isProcessing: false };
    }
    setStatusById((prev) => ({ ...prev, ...initialStatus }));
  };

  const processSingleImage = useCallback(async (img: ImageFile) => {
    setStatusById((prev) => {
      // Skip if already processing or has caption
      const currentStatus = prev[img.id];
      if (currentStatus?.isProcessing || currentStatus?.caption) return prev;

      return {
        ...prev,
        [img.id]: {
          ...(prev[img.id] || { id: img.id, caption: "", isProcessing: true }),
          isProcessing: true,
          error: undefined,
        },
      };
    });

    try {
      const caption = await captionImage(
        img,
        "Describe this image in detail.",
        (chunk) => {
          setStatusById((prev) => ({
            ...prev,
            [img.id]: {
              ...(prev[img.id] || {
                id: img.id,
                caption: "",
                isProcessing: true,
              }),
              caption: (prev[img.id]?.caption || "") + chunk,
            },
          }));
        }
      );
      setStatusById((prev) => ({
        ...prev,
        [img.id]: {
          ...(prev[img.id] || { id: img.id, caption: "" }),
          caption,
          isProcessing: false,
        },
      }));
    } catch (e) {
      setStatusById((prev) => ({
        ...prev,
        [img.id]: {
          ...(prev[img.id] || { id: img.id, caption: "" }),
          isProcessing: false,
          error: e instanceof Error ? e.message : String(e),
        },
      }));
    }
  }, []);

  // Auto-process images when they're added and model is ready
  useEffect(() => {
    if (!isModelReady || images.length === 0) return;

    // Process images one by one
    const processQueue = async () => {
      for (const img of images) {
        await processSingleImage(img);
      }
    };

    processQueue();
  }, [images, isModelReady, processSingleImage]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // No toast system here; keep silent success
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const hasImages = images.length > 0;

  return (
    <>
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="brutalist-accent-card mb-8">
          <h1 className="text-3xl font-bold text-center uppercase mb-6">
            {t("PageTitle")}
          </h1>

          {(!isModelReady && !modelError) || isLoadingModel ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <ModelLoadingCard
                  title="AI Caption Model"
                  description="FastVLM-0.5B-ONNX model for image captioning"
                  isLoading={isLoadingModel}
                  isReady={isModelReady}
                  loadingStatus={modelLoadingStatus}
                />
              </div>

              <div className="space-y-6">
                <Card title={t("HowItWorksTitle")} variant="accent">
                  <div className="space-y-4">
                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep1Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep1Desc")}</p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep2Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep2Desc")}</p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep3Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep3Desc")}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : modelError ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <ModelLoadingCard
                  title="AI Caption Model"
                  isLoading={false}
                  isReady={false}
                  error={modelError}
                  onRetry={() => window.location.reload()}
                />
              </div>

              <div className="space-y-6">
                <Card title={t("HowItWorksTitle")} variant="accent">
                  <div className="space-y-4">
                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep1Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep1Desc")}</p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep2Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep2Desc")}</p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep3Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep3Desc")}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card
                  collapsible={false}
                  title={t("MainCardTitle")}
                  variant="accent"
                  headerRight={null}
                >
                  <div className="space-y-6 relative">
                    {/* Info Section */}
                    <div className="brutalist-border p-4 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("MainCardInfoTitle")}
                      </h3>
                      <p className="text-sm mb-2">
                        {t("MainCardInfoDescription")}
                      </p>
                    </div>

                    {/* Upload Area - Hidden when images are selected */}
                    {!hasImages && (
                      <div className="brutalist-border p-6 bg-white">
                        <div className="space-y-4">
                          <ImageUploadDropzone
                            onFilesSelected={handleSelectFiles}
                            title={t("ButtonSelectImages")}
                            description="Select images to auto-caption"
                          />
                        </div>
                      </div>
                    )}

                    {/* Results Grid */}
                    {hasImages && (
                      <Card title={t("ResultsTitle")}>
                        <div className="space-y-3">
                          {images.map((img) => {
                            const status = statusById[img.id];
                            return (
                              <div
                                key={img.id}
                                className="grid grid-cols-1 md:grid-cols-2 gap-3 brutalist-border p-3 bg-white"
                              >
                                <div>
                                  {img.thumbnailDataUrl && (
                                    <img
                                      src={img.thumbnailDataUrl}
                                      alt={img.file.name}
                                      className="max-h-64 object-contain brutalist-border"
                                    />
                                  )}
                                  <div className="text-xs mt-1 text-gray-600 truncate">
                                    {img.file.name}
                                  </div>
                                </div>
                                <div className="flex flex-col h-full">
                                  <div className="flex-1 brutalist-border bg-slate-50 p-2 overflow-auto whitespace-pre-wrap text-sm">
                                    {status?.isProcessing ? (
                                      <div className="flex flex-col items-center justify-center h-full space-y-2">
                                        <Loader size="sm" />
                                        <span className="text-xs text-gray-500">
                                          {t("ProcessingImage", {
                                            imageId: img.file.name,
                                          })}
                                        </span>
                                      </div>
                                    ) : (
                                      status?.caption || ""
                                    )}
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleCopy(status?.caption || "")
                                      }
                                      disabled={!status?.caption}
                                    >
                                      {t("ButtonDownload", { default: "Copy" })}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card title={t("HowItWorksTitle")} variant="accent">
                  <div className="space-y-4">
                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep1Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep1Desc")}</p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep2Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep2Desc")}</p>
                    </div>

                    <div className="brutalist-border p-3 bg-white">
                      <h3 className="font-bold mb-2">
                        {t("HowItWorksStep3Title")}
                      </h3>
                      <p className="text-sm">{t("HowItWorksStep3Desc")}</p>
                    </div>
                  </div>
                </Card>

                {/* Clear All Button - Only shown when images are selected */}
                {hasImages && (
                  <div className="brutalist-border p-4 bg-white">
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setImages([]);
                          setStatusById({});
                        }}
                      >
                        {t("goBack", { default: "Clear All" })}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Upload Section in Sidebar - Only show when more than 1 image selected */}
                {images.length > 1 && (
                  <div className="brutalist-border p-4 bg-white">
                    <ImageUploadDropzone
                      onFilesSelected={handleSelectFiles}
                      title="Add More Images"
                      description="Drag & drop or click to add additional images"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
