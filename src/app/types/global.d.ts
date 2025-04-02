// Type definitions for OpenCV.js
declare namespace opencv {
  class Mat {
    constructor();
    delete(): void;
    data: Uint8Array;
    rows: number;
    cols: number;
    channels(): number;
    convertTo(dst: Mat, type: number, alpha?: number, beta?: number): void;
    floatPtr(row: number, col: number): Float32Array;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class MatVector {
    constructor();
    push_back(mat: Mat): void;
    get(index: number): Mat;
    delete(): void;
  }

  // Common methods
  function imread(imageSource: HTMLImageElement | HTMLCanvasElement): Mat;
  function imshow(canvasOutput: string | HTMLCanvasElement, mat: Mat): void;
  function resize(src: Mat, dst: Mat, dsize: Size, fx: number, fy: number, interpolation: number): void;
  function cvtColor(src: Mat, dst: Mat, code: number, dstCn?: number): void;
  function split(src: Mat, mv: MatVector): void;

  // Common constants
  const COLOR_BGR2RGB: number;
  const COLOR_RGB2BGR: number;
  const COLOR_BGR2GRAY: number;
  const COLOR_GRAY2BGR: number;
  const INTER_AREA: number;
  const INTER_LINEAR: number;
  const CV_32F: number;
}

// Extend ONNX Runtime typings
declare module 'onnxruntime-web' {
  export namespace env {
    export namespace wasm {
      export let wasmPaths: Record<string, string>;
      export let numThreads: number;
      export let simd: boolean;
      export let proxy: boolean;
    }
  }
}

// Global declarations
interface Window {
  cv: typeof opencv;
  onOpenCvReady?: () => void;
  preloadModels?: () => void;
} 