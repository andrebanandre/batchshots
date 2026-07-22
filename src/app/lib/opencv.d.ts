declare namespace cv {
  class Mat {
    constructor();
    constructor(rows: number, cols: number, type: number);
    constructor(rows: number, cols: number, type: number, scalar: Scalar);
    delete(): void;
    clone(): Mat;
    channels(): number;
    cols: number;
    rows: number;
    data: Uint8Array;
    data32F: Float32Array;
    ucharPtr(row: number, col: number): Uint8Array;
    ucharAt(row: number, col: number): number;
    floatPtr(row: number, col: number): Float32Array;
    floatAt(row: number, col: number): number;
    convertTo(dst: Mat, rtype: number, alpha?: number, beta?: number): void;
    roi(rect: Rect): Mat;
    copyTo(dst: Mat, mask?: Mat): void;
    setTo(value: Scalar, mask?: Mat): void;
    size(): Size;
    type(): number;
    total(): number;
    isContinuous(): boolean;
    // N-dimensional blob support (DNN outputs)
    dims: number;
    matSize: number[];
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
  
  class Scalar {
    constructor(v0: number, v1?: number, v2?: number, v3?: number);
  }

  class Rect {
    constructor(x: number, y: number, width: number, height: number);
    x: number;
    y: number;
    width: number;
    height: number;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class RectVector {
    delete(): void;
    size(): number;
    get(index: number): Rect;
    push_back(rect: Rect): void;
  }

  class IntVector {
    delete(): void;
    size(): number;
    get(index: number): number;
    push_back(value: number): void;
  }

  class FloatVector {
    delete(): void;
    size(): number;
    get(index: number): number;
    push_back(value: number): void;
  }

  // ---- DNN module (OpenCV 5 build) ----
  namespace dnn {
    class Net {
      setInput(blob: Mat, name?: string): void;
      forward(outputName?: string): Mat;
      delete(): void;
      empty(): boolean;
    }
  }
  type Net = dnn.Net;

  function readNetFromONNX(bufferOrPath: Uint8Array | string): dnn.Net;
  // Emscripten virtual FS helpers (used to feed model bytes to readNetFromONNX)
  function FS_createDataFile(parent: string, name: string, data: Uint8Array, canRead: boolean, canWrite: boolean, canOwn?: boolean): void;
  function FS_unlink(path: string): void;
  function readNet(model: string, config?: string, framework?: string): dnn.Net;
  function blobFromImage(
    image: Mat,
    scalefactor?: number,
    size?: Size,
    mean?: Scalar,
    swapRB?: boolean,
    crop?: boolean
  ): Mat;
  function NMSBoxes(
    bboxes: RectVector,
    scores: FloatVector,
    scoreThreshold: number,
    nmsThreshold: number,
    indices: IntVector
  ): void;

  // Image processing
  function imread(imageSource: HTMLImageElement | HTMLCanvasElement | string): Mat;
  function matFromImageData(imageData: ImageData): Mat;
  function matFromArray(rows: number, cols: number, type: number, array: ArrayLike<number>): Mat;
  function imshow(canvasSource: HTMLCanvasElement | string, mat: Mat): void;
  function cvtColor(src: Mat, dst: Mat, code: number, dstCn?: number): void;
  function convertScaleAbs(src: Mat, dst: Mat, alpha?: number, beta?: number): void;
  function resize(src: Mat, dst: Mat, dsize: Size, fx?: number, fy?: number, interpolation?: number): void;
  function split(src: Mat, mv: MatVector): void;
  function merge(mv: MatVector, dst: Mat): void;
  function GaussianBlur(src: Mat, dst: Mat, ksize: Size, sigmaX: number, sigmaY?: number, borderType?: number): void;
  function addWeighted(src1: Mat, alpha: number, src2: Mat, beta: number, gamma: number, dst: Mat, dtype?: number): void;
  function Laplacian(src: Mat, dst: Mat, ddepth: number, ksize?: number, scale?: number, delta?: number, borderType?: number): void;
  function meanStdDev(src: Mat, mean: Mat, stddev: Mat, mask?: Mat): void;
  function minMaxLoc(src: Mat, mask?: Mat): { minVal: number; maxVal: number; minLoc: Point; maxLoc: Point };
  function copyMakeBorder(src: Mat, dst: Mat, top: number, bottom: number, left: number, right: number, borderType: number, value?: Scalar): void;
  function findContours(image: Mat, contours: MatVector, hierarchy: Mat, mode: number, method: number): void;
  function boundingRect(contour: Mat): Rect;
  function contourArea(contour: Mat, oriented?: boolean): number;
  function threshold(src: Mat, dst: Mat, thresh: number, maxval: number, type: number): number;
  function getPerspectiveTransform(src: Mat, dst: Mat): Mat;
  function warpPerspective(src: Mat, dst: Mat, M: Mat, dsize: Size, flags?: number, borderMode?: number, borderValue?: Scalar): void;
  function calcHist(images: MatVector, channels: IntVector | number[], mask: Mat, hist: Mat, histSize: IntVector | number[], ranges: FloatVector | number[]): void;
  function inpaint(src: Mat, mask: Mat, dst: Mat, inpaintRadius: number, flags: number): void;
  function dilate(src: Mat, dst: Mat, kernel: Mat, anchor?: Point, iterations?: number, borderType?: number, borderValue?: Scalar): void;
  function getStructuringElement(shape: number, ksize: Size): Mat;

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
  const COLOR_BGR2HLS: number;
  const COLOR_HLS2BGR: number;
  const INTER_LINEAR: number;
  const INTER_AREA: number;
  const INTER_CUBIC: number;
  const CV_32FC1: number;
  const CV_64F: number;
  const COLOR_RGBA2RGB: number;
  const COLOR_RGB2GRAY: number;
  const BORDER_CONSTANT: number;
  const BORDER_DEFAULT: number;
  const THRESH_BINARY: number;
  const RETR_EXTERNAL: number;
  const RETR_LIST: number;
  const CHAIN_APPROX_SIMPLE: number;
  const INPAINT_TELEA: number;
  const INPAINT_NS: number;
  const MORPH_RECT: number;
  const MORPH_ELLIPSE: number;
}

declare global {
  interface Window {
    cv: typeof cv;
  }
} 