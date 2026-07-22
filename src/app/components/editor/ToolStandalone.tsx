'use client';

/**
 * Standalone tool page shell: own image session (same ImageFile model as
 * the editor) + upload + big ImagePreview visualization (shared with the
 * main editor) + ONE tool section Card + always-present Download ZIP card.
 * Used by the SEO tool URLs (/background-removal etc.).
 */

import React, { ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import ImageUploadDropzone from '../ImageUploadDropzone';
import ImagePreview, { ImageFile } from '../ImagePreview';
import ToolPageWrapper from '../ToolPageWrapper';
import Button from '../Button';
import { EditorToolsProvider } from '../../contexts/EditorToolsContext';
import DownloadZipCard from './DownloadZipCard';
import { createImageFile } from '../../lib/imageProcessing';
import { isHeicFormat, convertHeicToFormat } from '../../utils/imageFormatConverter';

const MAX_IMAGES = 100;

export default function ToolStandalone({
  title,
  description,
  children,
  showToolWhenEmpty = false,
}: {
  title: string;
  /** Friendly one-liner shown above the uploader (from the tool's `intro` key) */
  description?: string;
  children: ReactNode; // the tool section Card(s)
  /** Render the tool sidebar even before any image is uploaded (e.g. text
   *  extraction accepts documents without images). */
  showToolWhenEmpty?: boolean;
}) {
  const t = useTranslations('Pipeline');
  const moreImagesInputId = useId();
  const howItWorksSteps = [1, 2, 3].map((n) => ({
    title: t(`howItWorks.step${n}Title`),
    description: t(`howItWorks.step${n}Text`),
  }));
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isToolBusy, setIsToolBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (fileList: FileList) => {
    setIsUploading(true);
    try {
      const files = Array.from(fileList).slice(0, MAX_IMAGES - images.length);
      const created = await Promise.all(
        files.map(async (file) => {
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

  const handleMoreFilesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
      e.target.value = '';
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

  return (
    <ToolPageWrapper
      title={title}
      howItWorksTitle={t('howItWorks.title')}
      howItWorksSteps={howItWorksSteps}
      isLoading={isUploading}
      loadingStatus={t('preparingImages', { done: 0, total: 0 })}
    >
      {images.length === 0 ? (
        <div className={showToolWhenEmpty ? 'grid grid-cols-1 md:grid-cols-3 gap-6' : ''}>
          <div className={`brutalist-border p-6 bg-white space-y-4 ${showToolWhenEmpty ? 'md:col-span-2' : ''}`}>
            {description && <p className="text-lg">{description}</p>}
            <ImageUploadDropzone
              onFilesSelected={handleFiles}
              title={t('uploadTitle')}
              description={t('uploadStandaloneHint')}
            />
          </div>
          {showToolWhenEmpty && (
            <div className="space-y-6">
              <EditorToolsProvider
                value={{
                  images,
                  selectedImageId,
                  updateImage,
                  updateImages,
                  removeImages,
                  isProcessing: isToolBusy,
                  setToolBusy: setIsToolBusy,
                }}
              >
                {children}
              </EditorToolsProvider>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <ImagePreview
              images={images}
              selectedImageId={selectedImageId}
              onSelectImage={setSelectedImageId}
              onDownloadImage={handleDownloadImage}
              onDeleteImage={handleDeleteImage}
              isProcessing={isToolBusy}
              maxImagesAllowed={100}
            />

            <div className="flex flex-col space-y-2">
              <div>
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={handleMoreFilesInputChange}
                  className="hidden"
                  id={moreImagesInputId}
                  disabled={isToolBusy || images.length >= MAX_IMAGES}
                />
                <label htmlFor={moreImagesInputId}>
                  <Button
                    as="span"
                    variant="default"
                    disabled={isToolBusy || images.length >= MAX_IMAGES}
                  >
                    {t('addMoreImages')}
                  </Button>
                </label>
              </div>
              <div className="text-sm">
                {t('imageCount', { count: images.length })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <EditorToolsProvider
              value={{
                images,
                selectedImageId,
                updateImage,
                updateImages,
                removeImages,
                isProcessing: isToolBusy,
                setToolBusy: setIsToolBusy,
              }}
            >
              {children}
              <DownloadZipCard />
            </EditorToolsProvider>
          </div>
        </div>
      )}
    </ToolPageWrapper>
  );
}
