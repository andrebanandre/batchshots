import { heicTo, isHeic } from "heic-to";

// Helper function to detect HEIC/HEIF files
export const isHeicFormat = async (file: File): Promise<boolean> => {
  // Check extension first for efficiency
  if (
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  ) {
    return true;
  }

  // Try the heic-to library detection
  try {
    return await isHeic(file);
  } catch (error) {
    console.warn(
      "heic-to detection failed, falling back to header check",
      error
    );

    // If heic-to detection fails, examine file header bytes
    try {
      const arr = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const header = Array.from(arr)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      // HEIC files typically start with a "ftyp" box with brand "heic" or "heix" or "hevc" or "hevx"
      return (
        header.includes("66747970686569") || // ftyp + heic/heis/heif
        header.includes("6674797068656a") || // ftyp + hejs/hejk
        header.includes("66747970686576") // ftyp + hevc/hevs/hevx
      );
    } catch (headerError) {
      console.error("Error checking file header:", headerError);
      return false;
    }
  }
};

// Helper function to convert HEIC to another format
export const convertHeicToFormat = async (
  file: File,
  format: string = "png"
): Promise<File | null> => {
  try {
    console.log(`Converting HEIC image to ${format.toUpperCase()}:`, file.name);

    const mimeType = `image/${format}`;

    // Convert using heic-to
    const outputBlob = await heicTo({
      blob: file,
      type: mimeType as `image/${string}`,
      quality: 1,
    });

    const outputFileName = file.name.replace(/\.(heic|heif)$/i, `.${format}`);
    return new File([outputBlob], outputFileName, { type: mimeType });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    return null;
  }
};

// Supported format targets
export const supportedOutputFormats = [
  { id: "jpg", name: "JPEG (.jpg)", mimeType: "image/jpeg" },
  { id: "png", name: "PNG (.png)", mimeType: "image/png" },
  { id: "webp", name: "WebP (.webp)", mimeType: "image/webp" },
  { id: "avif", name: "AVIF (.avif)", mimeType: "image/avif" },
];

// Function to convert image between formats using OpenCV
export const convertImageFormat = async (
  imageFile: File,
  targetFormat: string,
  quality: number = 95
): Promise<File | null> => {
  // Handle HEIC specially
  if (await isHeicFormat(imageFile)) {
    return convertHeicToFormat(imageFile, targetFormat);
  }

  try {
    // Create an image element from the file
    const imageUrl = URL.createObjectURL(imageFile);
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Create canvas and context
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw the image to the canvas
    ctx.drawImage(img, 0, 0);

    // Convert to the target format
    const mimeType = `image/${targetFormat}`;
    const outputDataUrl = canvas.toDataURL(mimeType, quality / 100);

    // Convert data URL to blob
    const binaryString = atob(outputDataUrl.split(",")[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    // Clean up
    URL.revokeObjectURL(imageUrl);

    // Generate new filename with correct extension
    const originalName = imageFile.name;
    const baseName = originalName.includes(".")
      ? originalName.substring(0, originalName.lastIndexOf("."))
      : originalName;
    const newFileName = `${baseName}.${targetFormat}`;

    // Return as File
    return new File([blob], newFileName, { type: mimeType });
  } catch (error) {
    console.error("Error converting image format:", error);
    return null;
  }
};
