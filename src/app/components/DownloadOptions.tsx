import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';

export type ImageFormat = 'jpg' | 'webp' | 'png';

interface DownloadOptionsProps {
  onDownload: (format: ImageFormat) => void;
  hasBackgroundRemovedImages?: boolean;
  className?: string;
}

export default function DownloadOptions({
  onDownload,
  hasBackgroundRemovedImages = false,
  className = '',
}: DownloadOptionsProps) {
  // Set initial format to PNG if background-removed images are present
  const [downloadFormat, setDownloadFormat] = useState<ImageFormat>(
    hasBackgroundRemovedImages ? 'png' : 'jpg'
  );

  // Update format when background removed status changes
  useEffect(() => {
    if (hasBackgroundRemovedImages) {
      setDownloadFormat('png');
    }
  }, [hasBackgroundRemovedImages]);

  const handleFormatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDownloadFormat(e.target.value as ImageFormat);
  };

  const handleDownload = () => {
    onDownload(downloadFormat);
  };

  return (
    <Card title="DOWNLOAD OPTIONS" className={className} variant="accent">
      <div className="space-y-6">
        {/* Format Selection */}
        <div className="brutalist-border p-3 bg-white">
          <h3 className="font-bold mb-3 text-sm uppercase">Image Format</h3>
          <div className="space-y-3">
            <div>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="downloadFormat"
                    value="jpg"
                    checked={downloadFormat === 'jpg'}
                    onChange={handleFormatChange}
                    className="mr-2 brutalist-border w-4 h-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black rounded-full"
                    style={{
                      backgroundImage: downloadFormat === 'jpg' ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='4'/%3e%3c/svg%3e\")" : "",
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat"
                    }}
                  />
                  <span>JPG</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="downloadFormat"
                    value="webp"
                    checked={downloadFormat === 'webp'}
                    onChange={handleFormatChange}
                    className="mr-2 brutalist-border w-4 h-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black rounded-full"
                    style={{
                      backgroundImage: downloadFormat === 'webp' ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='4'/%3e%3c/svg%3e\")" : "",
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat"
                    }}
                  />
                  <span>WebP</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="downloadFormat"
                    value="png"
                    checked={downloadFormat === 'png'}
                    onChange={handleFormatChange}
                    className="mr-2 brutalist-border w-4 h-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black rounded-full"
                    style={{
                      backgroundImage: downloadFormat === 'png' ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='4'/%3e%3c/svg%3e\")" : "",
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat"
                    }}
                  />
                  <span>PNG</span>
                </label>
              </div>
              
              {hasBackgroundRemovedImages && (
                <div className="mt-2 text-xs text-[#4F46E5] font-bold">
                  PNG format recommended for transparent backgrounds
                </div>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={handleDownload}
          fullWidth
          variant="accent"
        >
          DOWNLOAD ALL
        </Button>
      </div>
    </Card>
  );
} 