import { ImageFile } from "../components/ImagePreview";

type StreamCallback = (chunk: string) => void;

let worker: Worker | null = null;
let isWorkerInitialized = false;
let initQueue: { resolve: () => void; reject: (e: Error) => void }[] = [];

export const initializeCaptionWorker = () => {
  if (typeof window === "undefined" || !window.Worker) {
    return Promise.reject(
      new Error("Web workers not supported in this environment")
    );
  }

  return new Promise<void>((resolve, reject) => {
    if (isWorkerInitialized) {
      resolve();
      return;
    }

    if (worker) {
      initQueue.push({ resolve, reject });
      return;
    }

    try {
      worker = new Worker(
        new URL(
          "../[locale]/ai-image-seo-caption-generation/fastvlm-caption.worker.js",
          import.meta.url
        )
      );

      const handleMessage = (event: MessageEvent) => {
        const { status } = event.data || {};
        if (status === "ready") {
          isWorkerInitialized = true;
          resolve();
          initQueue.forEach((q) => q.resolve());
          initQueue = [];
          worker?.removeEventListener("message", handleMessage);
          return;
        }
        if (status === "error") {
          const err = new Error(event.data?.data || "Caption worker error");
          reject(err);
          initQueue.forEach((q) => q.reject(err));
          initQueue = [];
          worker?.removeEventListener("message", handleMessage);
          return;
        }
        // Ignore other status messages like webgpu_available/loading_model
      };

      worker!.addEventListener("message", handleMessage);
      worker!.postMessage({ type: "load" });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

export const captionImage = async (
  imageFile: ImageFile,
  prompt: string,
  onStream?: StreamCallback
): Promise<string> => {
  if (!worker) {
    await initializeCaptionWorker();
  }
  if (!worker) throw new Error("Caption worker is not available");

  return new Promise<string>((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      const { status, imageId, data } = event.data || {};
      if (imageId !== imageFile.id) return;

      if (status === "stream") {
        onStream?.(data || "");
        return;
      }
      if (status === "complete") {
        worker?.removeEventListener("message", handleMessage);
        resolve((data || "").trim());
        return;
      }
      if (status === "error") {
        worker?.removeEventListener("message", handleMessage);
        reject(new Error(data || "Caption generation failed"));
        return;
      }
    };

    worker!.addEventListener("message", handleMessage);

    const sendBlob = async () => {
      if (!imageFile.dataUrl) {
        worker?.removeEventListener("message", handleMessage);
        reject(new Error("No image data URL available"));
        return;
      }
      try {
        const response = await fetch(imageFile.dataUrl);
        const blob = await response.blob();
        worker?.postMessage({
          type: "caption",
          data: { imageId: imageFile.id, imageData: blob, prompt },
        });
      } catch (e) {
        worker?.removeEventListener("message", handleMessage);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };

    sendBlob();
  });
};

export const cleanupCaptionWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
    isWorkerInitialized = false;
    initQueue = [];
  }
};
