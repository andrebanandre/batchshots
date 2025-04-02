declare namespace cv {
  class Mat {
    cols: number;
    rows: number;
    data: Uint8Array;
    delete(): void;
    roi(rect: cv.Rect): cv.Mat;
  }
  
  class MatVector {
    delete(): void;
    get(index: number): cv.Mat;
  }
  
  class Size {
    constructor(width: number, height: number);
  }
  
  class Rect {
    constructor(x: number, y: number, width: number, height: number);
  }
  
  class Scalar {
    constructor(r: number, g: number, b: number, a?: number);
  }
  
  function imread(imageSource: HTMLImageElement | HTMLCanvasElement): cv.Mat;
  function imshow(canvas: HTMLCanvasElement, mat: cv.Mat): void;
  function resize(src: cv.Mat, dst: cv.Mat, dsize: cv.Size, fx: number, fy: number, interpolation: number): void;
  function cvtColor(src: cv.Mat, dst: cv.Mat, code: number, dstCn?: number): void;
  function split(src: cv.Mat, mv: cv.MatVector): void;
  
  const CV_8UC3: number;
  const CV_8UC1: number;
  const INTER_AREA: number;
  const COLOR_BGR2RGB: number;
  const COLOR_BGR2GRAY: number;
  const COLOR_GRAY2BGR: number;
}

declare global {
  interface Window {
    cv: typeof cv;
    preloadModels?: () => void;
  }
} 