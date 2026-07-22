'use client';

/**
 * Standalone tool page shell: own image session (same ImageFile model as
 * the editor) + upload + big ImagePreview visualization (shared with the
 * main editor) + full-width tool actions + Download ZIP card. Once images
 * are loaded, the sidebar becomes a reusable drag-and-drop upload area.
 * Used by the SEO tool URLs (/background-removal etc.).
 */

import React, { ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import ImageUploadDropzone from '../ImageUploadDropzone';
import ImagePreview, { ImageFile } from '../ImagePreview';
import ToolPageWrapper from '../ToolPageWrapper';
import type { HowItWorksStep } from '../HowItWorksSidebar';
import {
  AutoCropPreviewOptions,
  BatchDownloadOptions,
  EditorToolsProvider,
} from '../../contexts/EditorToolsContext';
import DownloadZipCard from './DownloadZipCard';
import { createImageFile } from '../../lib/imageProcessing';
import { isHeicFormat, convertHeicToFormat } from '../../utils/imageFormatConverter';

const MAX_IMAGES = 100;

export default function ToolStandalone({
  title,
  description,
  children,
  howItWorksSteps,
  howItWorksTitle,
  showToolWhenEmpty = false,
  accept = 'image/*,.heic,.heif',
  allowDocuments = false,
  uploadTitle,
  uploadDescription,
  uploadMoreTitle,
  uploadMoreDescription,
  getCollectionLabel,
  getItemCountLabel,
  maxItemsReachedTitle,
  loadingStatus,
  showDownloadZip = true,
  defaultBatchDownloadOptions,
  defaultAutoCropPreviewOptions,
}: {
  title: string;
  /** Friendly one-liner shown above the uploader (from the tool's `intro` key) */
  description?: string;
  children: ReactNode; // the tool section Card(s)
  /** Page-specific, user-friendly explanation of this tool. */
  howItWorksSteps?: HowItWorksStep[];
  howItWorksTitle?: string;
  /** Render the tool controls before any image is uploaded (e.g. text
   * extraction also accepts documents). */
  showToolWhenEmpty?: boolean;
  accept?: string;
  allowDocuments?: boolean;
  uploadTitle?: string;
  uploadDescription?: string;
  uploadMoreTitle?: string;
  uploadMoreDescription?: string;
  getCollectionLabel?: (current: number, max: number) => string;
  getItemCountLabel?: (count: number) => string;
  maxItemsReachedTitle?: string;
  loadingStatus?: string;
  showDownloadZip?: boolean;
  defaultBatchDownloadOptions?: BatchDownloadOptions;
  defaultAutoCropPreviewOptions?: AutoCropPreviewOptions;
}) {
  const t = useTranslations('Pipeline');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isToolBusy, setIsToolBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [batchDownloadOptions, setBatchDownloadOptions] = useState<
    BatchDownloadOptions | undefined
  >(defaultBatchDownloadOptions);
  const [autoCropPreviewOptions, setAutoCropPreviewOptions] = useState<
    AutoCropPreviewOptions | undefined
  >(defaultAutoCropPreviewOptions);
  const resolvedHowItWorksSteps = howItWorksSteps ?? [
    {
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Text'),
    },
    {
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Text'),
    },
    {
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Text'),
    },
  ];

  const handleFiles = async (fileList: FileList) => {
    setIsUploading(true);
    try {
      const files = Array.from(fileList)
        .filter((file) => {
          const extension = file.name.split('.').pop()?.toLowerCase();
          const isImage =
            file.type.startsWith('image/') ||
            extension === 'heic' ||
            extension === 'heif';
          const isDocument =
            allowDocuments &&
            (extension === 'pdf' || extension === 'docx' || extension === 'pptx');
          return isImage || isDocument;
        })
        .slice(0, MAX_IMAGES - images.length);
      const created = await Promise.all(
        files.map(async (file) => {
          const extension = file.name.split('.').pop()?.toLowerCase();
          if (
            allowDocuments &&
            (extension === 'pdf' || extension === 'docx' || extension === 'pptx')
          ) {
            return {
              id: crypto.randomUUID(),
              file,
              dataUrl: null,
              thumbnailDataUrl: null,
              documentType: extension,
            } satisfies ImageFile;
          }
          const source = (await isHeicFormat(file))
            ? (await convertHeicToFormat(file, 'png')) ?? file
            : file;
          return createImageFile(source);
        })
      );
      setImages((prev) => [...prev, ...created]);
      if (!selectedImageId && created.length > 0) {
        setSelectedImageId(created[0].id);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const updateImage = (id: string, patch: Partial<ImageFile>) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  };
  const removeImages = (ids: string[]) => {
    const drop = new Set(ids);
    setImages((prev) => prev.filter((img) => !drop.has(img.id)));
    setSelectedImageId((sel) => (sel && drop.has(sel) ? null : sel));
  };

  const handleDeleteImage = (id: string) => removeImages([id]);

  const handleDownloadImage = (image: ImageFile) => {
    const url = image.processedDataUrl ?? image.dataUrl;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = image.seoName ? `${image.seoName}` : image.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateImages = (patches: { id: string; patch: Partial<ImageFile> }[]) => {
    setImages((prev) => {
      const byId = new Map(patches.map((p) => [p.id, p.patch]));
      return prev.map((img) => {
        const patch = byId.get(img.id);
        return patch ? { ...img, ...patch } : img;
      });
    });
  };

  const editorToolsValue = {
    images,
    selectedImageId,
    updateImage,
    updateImages,
    removeImages,
    isProcessing: isToolBusy,
    setToolBusy: setIsToolBusy,
    batchDownloadOptions,
    setBatchDownloadOptions,
    autoCropPreviewOptions,
    setAutoCropPreviewOptions,
  };

  const sidebarContent = images.length > 0 ? (
    <div className="brutalist-border p-4 bg-white space-y-3">
      <ImageUploadDropzone
        onFilesSelected={handleFiles}
        disabled={isUploading || isToolBusy || images.length >= MAX_IMAGES}
        multiple
        accept={accept}
        title={
          images.length >= MAX_IMAGES
            ? maxItemsReachedTitle ?? t('maxImagesReached', { max: MAX_IMAGES })
            : uploadMoreTitle ?? t('addMoreImages')
        }
        description={
          uploadMoreDescription ??
          t('uploadMoreHint', {
            count: Math.max(0, MAX_IMAGES - images.length),
          })
        }
        className="w-full max-w-none"
      />
      <p className="text-sm text-center">
        {getItemCountLabel
          ? getItemCountLabel(images.length)
          : t('imageCount', { count: images.length })}
      </p>
    </div>
  ) : undefined;

  return (
    <ToolPageWrapper
      title={title}
      howItWorksTitle={howItWorksTitle ?? t('howItWorks.title')}
      howItWorksSteps={resolvedHowItWorksSteps}
      sidebarContent={sidebarContent}
      isLoading={isUploading}
      loadingStatus={loadingStatus ?? t('preparingImages', { done: 0, total: 0 })}
    >
      {images.length === 0 ? (
        <div className="space-y-6">
          <div className="brutalist-border p-6 bg-white space-y-4">
            {description && <p className="text-lg">{description}</p>}
            <ImageUploadDropzone
              onFilesSelected={handleFiles}
              accept={accept}
              title={uploadTitle ?? t('uploadTitle')}
              description={uploadDescription ?? t('uploadStandaloneHint')}
            />
          </div>
          {showToolWhenEmpty && (
            <div>
              <EditorToolsProvider value={editorToolsValue}>
                {children}
              </EditorToolsProvider>
            </div>
          )}
        </div>
      ) : (
        <EditorToolsProvider value={editorToolsValue}>
          <div className="space-y-6">
            <ImagePreview
              images={images}
              selectedImageId={selectedImageId}
              onSelectImage={setSelectedImageId}
              onDownloadImage={handleDownloadImage}
              onDeleteImage={handleDeleteImage}
              onUpdateImage={updateImage}
              cropPreviewOptions={autoCropPreviewOptions}
              isProcessing={isToolBusy}
              maxImagesAllowed={100}
              getCollectionLabel={getCollectionLabel}
            />
            {children}
            {showDownloadZip && <DownloadZipCard />}
          </div>
        </EditorToolsProvider>
      )}
    </ToolPageWrapper>
  );
}
