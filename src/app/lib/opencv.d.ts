declare namespace cv {
  class Mat {
    delete(): void;
    cols: number;
    rows: number;
    data: Uint8Array;
    ucharPtr(row: number, col: number): Uint8Array;
    ucharAt(row: number, col: number): number;
  }
  
  class MatVector {
    delete(): void;
    size(): number;
    get(index: number): Mat;
    push_back(mat: Mat): void;
  }
  
  class Size {
    constructor(width: number, height: number);
    width: number;
    height: number;
  }
  
  // Image processing
  function imread(imageSource: HTMLImageElement | HTMLCanvasElement | string): Mat;
  function imshow(canvasSource: HTMLCanvasElement | string, mat: Mat): void;
  function cvtColor(src: Mat, dst: Mat, code: number, dstCn?: number): void;
  function convertScaleAbs(src: Mat, dst: Mat, alpha?: number, beta?: number): void;
  function resize(src: Mat, dst: Mat, dsize: Size, fx?: number, fy?: number, interpolation?: number): void;
  function split(src: Mat, mv: MatVector): void;
  function merge(mv: MatVector, dst: Mat): void;
  
  // Constants
  const CV_8U: number;
  const CV_8UC1: number;
  const CV_8UC3: number;
  const CV_8UC4: number;
  const CV_32F: number;
  const COLOR_RGBA2GRAY: number;
  const COLOR_RGBA2BGR: number;
  const COLOR_BGR2GRAY: number;
  const COLOR_GRAY2BGR: number;
  const INTER_LINEAR: number;
  const INTER_AREA: number;
}

declare global {
  interface Window {
    cv: typeof cv;
  }
} 