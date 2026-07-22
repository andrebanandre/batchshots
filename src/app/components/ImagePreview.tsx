import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Button from "./Button";
import type { ImageFormat } from "../lib/imageProcessing";
import { useTranslations } from "next-intl";
import CropOverlay, {
  CropAspectKey,
  CropRect,
} from "./editor/CropOverlay";

export interface ImageFile {
  id: string;
  file: File;
  dataUrl: string | null;
  thumbnailDataUrl: string | null;
  width?: number;
  height?: number;
  processedDataUrl?: string;
  processedThumbnailUrl?: string;
  backgroundRemoved?: boolean;
  processedBlob?: Blob;
  dimensions?: { width: number; height: number; size: string };
  appliedPreset?: {
    name: string;
    width: number;
    height: number | null;
    quality: number;
  };
  seoName?: string; // SEO-friendly filename
  originalName?: string; // Original filename for reference
  // ---- tool section artifacts (OpenCV 5 tools) ----
  phash?: string;
  embedding?: Float32Array;
  /** id of the kept best image this one duplicates */
  duplicateOf?: string | null;
  /** excluded from batch actions & export (duplicates / quality rejects) */
  excluded?: boolean;
  quality?: import('../types/pipeline').QualityReport;
  ocrText?: string;
  caption?: string;
  dominantColor?: string;
  classLabel?: string;
  bbox?: import('../types/pipeline').BBox;
}

interface ImagePreviewProps {
  images: ImageFile[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  onDownloadImage: (image: ImageFile, format?: ImageFormat) => void;
  onDeleteImage: (id: string) => void;
  isProcessing?: boolean;
  className?: string;
  appliedSettings?: {
    preset: string | null;
    presetName?: string;
    applyToAll: boolean;
  };
  maxImagesAllowed?: number;
  /** Keep a flagged duplicate (clears excluded/duplicateOf on it). */
  onKeepDuplicate?: (id: string) => void;
  /** Remove a flagged duplicate from the batch entirely. */
  onRemoveDuplicate?: (id: string) => void;
  /** Targeted patch applied by the manual crop tool. */
  onUpdateImage?: (id: string, patch: Partial<ImageFile>) => void;
}

const DEFAULT_CROP_RECT: CropRect = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };

/** Loads an image and resolves its natural pixel dimensions. */
function loadNaturalSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Crops `sourceUrl` to the pixel rect implied by normalized `rect`, returning a blob: URL PNG. */
async function cropImageToBlobUrl(sourceUrl: string, rect: CropRect): Promise<string> {
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const sx = Math.round(rect.x * bitmap.width);
    const sy = Math.round(rect.y * bitmap.height);
    const sw = Math.max(1, Math.round(rect.w * bitmap.width));
    const sh = Math.max(1, Math.round(rect.h * bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    const outBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!outBlob) throw new Error("Canvas toBlob failed");
    return URL.createObjectURL(outBlob);
  } finally {
    bitmap.close();
  }
}

/** Revokes a previous blob: URL, ignoring already-revoked/non-blob values. */
function revokeIfBlobUrl(url?: string) {
  if (url && url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }
}

// Get the appropriate image URL to display (thumbnail or full)
function getDisplayUrl(image: ImageFile): string {
  // Prefer processed thumbnail for previews
  if (image.processedThumbnailUrl) return image.processedThumbnailUrl;
  // Fall back to processed full size if available
  if (image.processedDataUrl) return image.processedDataUrl;
  // Fall back to thumbnail if available
  if (image.thumbnailDataUrl) return image.thumbnailDataUrl;
  // Last resort - original image
  return image.dataUrl || "";
}

/**
 * Cluster images into visual groups: a "best" image immediately followed
 * by its duplicates (as ordered by the caller — see page.tsx sort). Images
 * without a matching preceding "best" render as their own single-item
 * group.
 */
function buildDisplayGroups(images: ImageFile[]): ImageFile[][] {
  const groups: ImageFile[][] = [];
  let i = 0;
  while (i < images.length) {
    const image = images[i];
    if (!image.duplicateOf) {
      const cluster = [image];
      let j = i + 1;
      while (j < images.length && images[j].duplicateOf === image.id) {
        cluster.push(images[j]);
        j++;
      }
      groups.push(cluster);
      i = j;
    } else {
      groups.push([image]);
      i++;
    }
  }
  return groups;
}

export default function ImagePreview({
  images,
  selectedImageId,
  onSelectImage,
  onDownloadImage,
  onDeleteImage,
  isProcessing = false,
  className = "",
  appliedSettings,
  maxImagesAllowed = 10,
  onKeepDuplicate,
  onRemoveDuplicate,
  onUpdateImage,
}: ImagePreviewProps) {
  const t = useTranslations("Components.ImagePreview");

  // State to store image dimensions
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number; size: string }>
  >({});
  // State for editing SEO name
  const [editingSeoName, setEditingSeoName] = useState<string | null>(null);
  const [seoNameValue, setSeoNameValue] = useState("");
  // State to store locally updated images
  const [localImages, setLocalImages] = useState<ImageFile[]>(images);

  // State for image zoom and pan functionality
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // State for manual crop mode
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_CROP_RECT);
  const [cropAspect, setCropAspect] = useState<CropAspectKey>("free");
  const [cropNaturalSize, setCropNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [cropBusy, setCropBusy] = useState(false);

  // Reset zoom, position and crop mode when selected image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCropMode(false);
    setCropRect(DEFAULT_CROP_RECT);
    setCropAspect("free");
    setCropNaturalSize(null);
  }, [selectedImageId]);

  // Add wheel event listener with passive: false to prevent scrolling
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (cropMode) return;
      e.preventDefault();
      e.stopPropagation();

      // Zoom in or out based on wheel direction
      if (e.deltaY < 0) {
        setScale((prev) => Math.min(prev + 0.1, 5));
      } else {
        setScale((prev) => Math.max(prev - 0.1, 0.5));
      }
    };

    // Use the capture phase to intercept the event early
    container.addEventListener("wheel", handleWheelEvent, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheelEvent);
    };
  }, [cropMode]);

  // Update local images when prop changes
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  // Load the natural pixel size of the currently displayed image while in
  // crop mode, so the overlay can replicate object-contain geometry exactly.
  useEffect(() => {
    if (!cropMode) return;
    const image = localImages.find((img) => img.id === selectedImageId);
    if (!image) {
      setCropNaturalSize(null);
      return;
    }
    let cancelled = false;
    loadNaturalSize(getDisplayUrl(image))
      .then((size) => {
        if (!cancelled) setCropNaturalSize(size);
      })
      .catch(() => {
        if (!cancelled) setCropNaturalSize(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cropMode, selectedImageId, localImages]);

  // Effect to calculate dimensions for each image
  useEffect(() => {
    localImages.forEach((image) => {
      if (!imageDimensions[image.id]) {
        const img = new window.Image();
        img.onload = () => {
          // Calculate file size in KB or MB
          const sizeInBytes = image.file.size;
          const sizeInKB = sizeInBytes / 1024;
          const sizeFormatted =
            sizeInKB >= 1024
              ? `${(sizeInKB / 1024).toFixed(2)} MB`
              : `${sizeInKB.toFixed(2)} KB`;

          setImageDimensions((prev) => ({
            ...prev,
            [image.id]: {
              width: img.width,
              height: img.height,
              size: sizeFormatted,
            },
          }));
        };
        img.src = image.dataUrl || "";
      }
    });
  }, [localImages, imageDimensions]);

  // Function to handle download of a single image
  const handleLocalDownloadImage = (image: ImageFile) => {
    onDownloadImage(image);
  };

  // Function to handle image deletion
  const handleDelete = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation(); // Prevent triggering the thumbnail selection
    onDeleteImage(imageId);
  };

  // Start editing SEO name
  const handleStartEditSeoName = (imageId: string, currentSeoName: string) => {
    setEditingSeoName(imageId);
    setSeoNameValue(currentSeoName);
  };

  // Save edited SEO name
  const handleSaveSeoName = () => {
    if (editingSeoName) {
      // Update the SEO name locally
      setLocalImages((prevImages) =>
        prevImages.map((image) =>
          image.id === editingSeoName
            ? { ...image, seoName: seoNameValue }
            : image
        )
      );
      setEditingSeoName(null);
    }
  };

  // Cancel editing SEO name
  const handleCancelEditSeoName = () => {
    setEditingSeoName(null);
  };

  // Zoom handling functions
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 5)); // Limit max zoom to 5x
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 0.5)); // Limit min zoom to 0.5x
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Handle mouse/touch events for dragging (disabled while cropping)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (cropMode) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (cropMode) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (cropMode) return;
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (cropMode) return;
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Handle wheel event for zooming with mouse wheel - keep this as a backup
  const handleWheel = (e: React.WheelEvent) => {
    if (cropMode) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.1, 5));
    } else {
      setScale((prev) => Math.max(prev - 0.1, 0.5));
    }
  };

  // Toggle manual crop mode: reset zoom/pan so overlay math (object-contain
  // against the container) matches what's rendered.
  const handleToggleCropMode = () => {
    setCropMode((prev) => {
      const next = !prev;
      if (next) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setCropRect(DEFAULT_CROP_RECT);
        setCropAspect("free");
      }
      return next;
    });
  };

  const handleCropCancel = () => {
    setCropMode(false);
  };

  const handleApplyCrop = useCallback(async () => {
    const image = localImages.find((img) => img.id === selectedImageId);
    if (!image || !onUpdateImage) return;
    const source = image.processedDataUrl ?? image.dataUrl;
    if (!source) return;
    setCropBusy(true);
    try {
      const blobUrl = await cropImageToBlobUrl(source, cropRect);
      revokeIfBlobUrl(image.processedDataUrl);
      revokeIfBlobUrl(image.processedThumbnailUrl);
      onUpdateImage(image.id, {
        processedDataUrl: blobUrl,
        processedThumbnailUrl: blobUrl,
      });
      setCropMode(false);
    } catch (error) {
      console.error("Failed to apply crop", error);
    } finally {
      setCropBusy(false);
    }
  }, [localImages, selectedImageId, onUpdateImage, cropRect]);

  const handleApplyCropToAll = useCallback(async () => {
    if (!onUpdateImage) return;
    setCropBusy(true);
    try {
      for (const image of localImages) {
        const source = image.processedDataUrl ?? image.dataUrl;
        if (!source) continue;
        try {
          const blobUrl = await cropImageToBlobUrl(source, cropRect);
          revokeIfBlobUrl(image.processedDataUrl);
          revokeIfBlobUrl(image.processedThumbnailUrl);
          onUpdateImage(image.id, {
            processedDataUrl: blobUrl,
            processedThumbnailUrl: blobUrl,
          });
        } catch (error) {
          console.error(`Failed to apply crop to image ${image.id}`, error);
        }
      }
      setCropMode(false);
    } finally {
      setCropBusy(false);
    }
  }, [localImages, onUpdateImage, cropRect]);

  if (localImages.length === 0) {
    return (
      <div className={`brutalist-border p-4 text-center ${className}`}>
        <p className="text-lg">{t("noImages")}</p>
      </div>
    );
  }

  // Find the selected image
  const selectedImage = selectedImageId
    ? localImages.find((img) => img.id === selectedImageId)
    : null;

  // Get dimensions of the selected image
  const selectedDimensions = selectedImage && imageDimensions[selectedImage.id];

  // Get file extension from name
  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  };

  // Format display name (SEO name if available, otherwise original filename)
  const getDisplayName = (image: ImageFile): string => {
    if (image.seoName) {
      const extension = getFileExtension(image.file.name);
      return `${image.seoName}.${extension}`;
    }
    return image.file.name;
  };

  return (
    <div className={`${className}`}>
      {/* Selected Image (Large View) */}
      {selectedImage && (
        <div className="mb-6 relative">
          <div className="brutalist-accent-card relative">
            {/* Zoom + crop controls */}
            <div className="absolute top-2 right-2 z-30 flex gap-2">
              {!cropMode && (
                <>
                  <button
                    onClick={handleZoomIn}
                    className="brutalist-border border-3 bg-white text-black w-8 h-8 flex items-center justify-center text-xl shadow-brutalist hover:translate-y-[-2px] transition-transform"
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="brutalist-border border-3 bg-white text-black w-8 h-8 flex items-center justify-center text-xl shadow-brutalist hover:translate-y-[-2px] transition-transform"
                    aria-label="Zoom out"
                  >
                    -
                  </button>
                  <button
                    onClick={handleReset}
                    className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white text-black w-auto px-2 h-8 flex items-center justify-center text-xs font-bold shadow-brutalist hover:translate-y-[-2px] transition-transform"
                    aria-label="Reset zoom"
                  >
                    RESET
                  </button>
                </>
              )}
              <button
                onClick={handleToggleCropMode}
                className={`brutalist-border border-3 w-auto px-2 h-8 flex items-center justify-center text-xs font-bold shadow-brutalist hover:translate-y-[-2px] transition-transform ${
                  cropMode ? "bg-primary text-white" : "bg-white text-black"
                }`}
                aria-label="Toggle crop mode"
                aria-pressed={cropMode}
              >
                {t("cropMode")}
              </button>
            </div>

            <div
              ref={imageContainerRef}
              className={`relative aspect-video w-full overflow-hidden touch-none`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{
                cursor: cropMode ? "default" : isDragging ? "grabbing" : "grab",
              }}
            >
              <div
                className="absolute transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                <Image
                  src={getDisplayUrl(selectedImage)}
                  alt={selectedImage.file.name}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                  draggable={false}
                />
              </div>

              {cropMode && cropNaturalSize && (
                <CropOverlay
                  containerRef={imageContainerRef}
                  naturalWidth={cropNaturalSize.width}
                  naturalHeight={cropNaturalSize.height}
                  rect={cropRect}
                  onRectChange={setCropRect}
                  aspect={cropAspect}
                  onAspectChange={setCropAspect}
                  onApply={handleApplyCrop}
                  onApplyAll={handleApplyCropToAll}
                  onCancel={handleCropCancel}
                  applyDisabled={cropBusy || !onUpdateImage}
                />
              )}

              {!cropMode && (
                <>
                  {/* Mobile zoom instructions */}
                  <div className="absolute bottom-2 left-2 brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white text-black text-xs p-2 md:hidden">
                    {t("zoomInstructions")}
                  </div>

                  {/* Zoom level indicator */}
                  <div className="absolute bottom-2 right-2 brutalist-border border-3 bg-white text-black text-xs p-2">
                    {t("zoomLevel", { scale: Math.round(scale * 100) })}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 flex flex-col space-y-2">
              {/* File name with SEO name editing capability */}
              {editingSeoName === selectedImage.id ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold">
                      {t("seoName.label")}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        className="flex-grow p-1 brutalist-border mr-1"
                        value={seoNameValue}
                        onChange={(e) => setSeoNameValue(e.target.value)}
                      />
                      <span className="text-sm">
                        .{getFileExtension(selectedImage.file.name)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      onClick={handleCancelEditSeoName}
                      size="sm"
                      variant="secondary"
                    >
                      {t("seoName.cancel")}
                    </Button>
                    <Button
                      onClick={handleSaveSeoName}
                      size="sm"
                      variant="accent"
                    >
                      {t("seoName.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="font-bold truncate flex-1">
                    {getDisplayName(selectedImage)}
                    {selectedImage.seoName && (
                      <button
                        onClick={() =>
                          handleStartEditSeoName(
                            selectedImage.id,
                            selectedImage.seoName!
                          )
                        }
                        className="ml-2 text-xs font-bold py-1 px-2 brutalist-border hover:bg-slate-100 text-gray-700"
                        title="Edit SEO name"
                      >
                        {t("seoName.edit")}
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={() => handleLocalDownloadImage(selectedImage)}
                    size="sm"
                    variant="secondary"
                    disabled={isProcessing}
                  >
                    {t("actions.download")}
                  </Button>
                </div>
              )}

              {/* Original filename if SEO name exists */}
              {selectedImage.seoName &&
                selectedImage.originalName &&
                !editingSeoName && (
                  <div className="text-xs text-gray-500">
                    <span className="font-bold">{t("originalName")} </span>
                    {selectedImage.originalName}
                  </div>
                )}

              <div className="text-sm grid grid-cols-2 gap-x-4">
                {selectedDimensions && (
                  <>
                    <div>
                      <span className="font-bold">
                        {t("fileInfo.dimensions")}{" "}
                      </span>
                      {selectedDimensions.width} × {selectedDimensions.height}px
                    </div>
                    <div>
                      <span className="font-bold">{t("fileInfo.size")} </span>
                      {selectedDimensions.size}
                    </div>
                  </>
                )}

                {/* Applied preset info */}
                {(selectedImage.appliedPreset ||
                  (appliedSettings &&
                    selectedImage.id === selectedImageId)) && (
                  <>
                    <div>
                      <span className="font-bold">{t("fileInfo.output")} </span>
                      {selectedImage.appliedPreset
                        ? `${selectedImage.appliedPreset.width}x${
                            selectedImage.appliedPreset.height ||
                            t("fileInfo.auto")
                          }`
                        : appliedSettings?.presetName
                        ? `[${appliedSettings.presetName}]`
                        : t("fileInfo.custom")}
                    </div>
                    <div>
                      <span className="font-bold">
                        {t("fileInfo.quality")}{" "}
                      </span>
                      {selectedImage.appliedPreset
                        ? `${selectedImage.appliedPreset.quality}%`
                        : "Applied"}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Grid */}
      <h3 className="font-bold text-lg uppercase mb-2">
        {t("allImages", { current: images.length, max: maxImagesAllowed })}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {buildDisplayGroups(images).map((group) => {
          const isCluster = group.length > 1;
          const groupContent = group.map((image) => {
            const index = images.indexOf(image);
            const dimensions = imageDimensions[image.id];
            const isDuplicate = !!image.duplicateOf;
            return (
              <div
                key={image.id}
                className={`brutalist-border p-2 cursor-pointer transition-transform hover:translate-y-[-2px] ${
                  selectedImageId === image.id
                    ? "border-3 border-l-accent border-t-primary border-r-black border-b-black"
                    : isDuplicate
                    ? "border-2 border-amber-500"
                    : "border-black"
                }`}
                onClick={() => onSelectImage(image.id)}
              >
                <div className={`relative aspect-square w-full overflow-hidden`}>
                  {/* Show PNG transparency indicator only in thumbnails */}
                  <Image
                    src={getDisplayUrl(image)}
                    alt={image.file.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="object-contain z-10"
                  />
                  {/* Image number indicator */}
                  <div className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded-sm z-10">
                    {index + 1}/{maxImagesAllowed}
                  </div>
                  {/* Duplicate badge */}
                  {isDuplicate && (
                    <div className="absolute bottom-1 left-1 bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-sm z-10 uppercase">
                      {t("duplicateBadge")}
                    </div>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, image.id)}
                    className="absolute top-1 right-1 brutalist-border border-2 border-black bg-accent text-black text-xs px-2 py-1 shadow-brutalist hover:translate-y-[-2px] transition-transform z-10"
                    disabled={isProcessing}
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 text-xs truncate">
                  {getDisplayName(image)}
                </div>
                {dimensions && (
                  <div className="mt-1 text-xs">
                    {dimensions.width} × {dimensions.height}px • {dimensions.size}
                  </div>
                )}
                {isDuplicate && (onKeepDuplicate || onRemoveDuplicate) && (
                  <div className="mt-2 flex gap-1">
                    {onKeepDuplicate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onKeepDuplicate(image.id);
                        }}
                        className="flex-1 text-[10px] font-bold brutalist-border bg-white hover:bg-slate-100 py-1"
                      >
                        {t("keepDuplicate")}
                      </button>
                    )}
                    {onRemoveDuplicate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveDuplicate(image.id);
                        }}
                        className="flex-1 text-[10px] font-bold brutalist-border bg-white hover:bg-slate-100 py-1"
                      >
                        {t("removeDuplicate")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          });

          if (!isCluster) return groupContent[0];

          return (
            <div
              key={group[0].id}
              className="col-span-full brutalist-border border-2 border-amber-500 p-2 bg-amber-50"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {groupContent}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
