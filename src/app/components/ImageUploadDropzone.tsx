import React, { useRef } from "react";

interface ImageUploadDropzoneProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string;
  title?: string;
  description?: React.ReactNode;
  className?: string;
}

export default function ImageUploadDropzone({
  onFilesSelected,
  disabled = false,
  multiple = true,
  accept = "image/*",
  title,
  description,
  className = "",
}: ImageUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
      // Also update the input element
      if (fileInputRef.current) {
        fileInputRef.current.files = files;
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        id="fileInput"
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <label
        htmlFor="fileInput"
        className={`brutalist-border border-3 border-dotted border-primary flex flex-col items-center justify-center w-full aspect-video bg-gray-50 transition-colors ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-gray-100"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center p-6">
          {/* Minimalist image upload icon with brand colors and black border */}
          <svg
            className="w-16 h-16 mx-auto mb-4"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Image frame in primary color with black border */}
            <rect
              x="8"
              y="16"
              width="48"
              height="40"
              fill="#4F46E5"
              stroke="#000"
              strokeWidth="1.5"
            />
            {/* Mountains in #fdc700 with black border */}
            <polygon
              points="14,52 28,36 38,46 50,28 56,56 8,56"
              fill="#fdc700"
              stroke="#000"
              strokeWidth="1.5"
            />
            {/* Sun in accent color with black border */}
            <circle
              cx="48"
              cy="24"
              r="6"
              fill="#FF6B6B"
              stroke="#000"
              strokeWidth="1.5"
            />
            {/* Up arrow in accent color, above the frame, with black border */}
            <path
              d="M32 6L40 16H36V28H28V16H24L32 6Z"
              fill="#FF6B6B"
              stroke="#000"
              strokeWidth="1.5"
            />
          </svg>
          {title && <p className="font-medium mb-2">{title}</p>}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </label>
    </div>
  );
}
