import React from 'react';
import Image from 'next/image';

export interface ImageFile {
  id: string;
  file: File;
  dataUrl: string;
  processedDataUrl?: string;
}

interface ImagePreviewProps {
  images: ImageFile[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  className?: string;
}

export default function ImagePreview({
  images,
  selectedImageId,
  onSelectImage,
  className = '',
}: ImagePreviewProps) {
  if (images.length === 0) {
    return (
      <div className={`brutalist-border p-4 text-center ${className}`}>
        <p className="text-lg">No images selected</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="font-bold text-lg uppercase mb-2">PREVIEW</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className={`brutalist-border p-2 cursor-pointer transition-transform hover:translate-y-[-2px] ${
              selectedImageId === image.id
                ? 'border-3 border-l-accent border-t-primary border-r-black border-b-black'
                : 'border-black'
            }`}
            onClick={() => onSelectImage(image.id)}
          >
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={image.processedDataUrl || image.dataUrl}
                alt={image.file.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-contain"
              />
            </div>
            <div className="mt-2 text-xs truncate">{image.file.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 