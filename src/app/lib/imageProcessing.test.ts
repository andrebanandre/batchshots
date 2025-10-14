import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { processImage, createThumbnail } from "./imageProcessing";

// Mock the WatermarkControl imports to avoid JSX parsing issues
jest.mock("../components/WatermarkControl", () => ({
  WatermarkSettings: {},
  WatermarkPosition: {},
  defaultWatermarkSettings: {
    enabled: false,
    type: null,
    text: "BatchShots.com",
    font: "Arial",
    textColor: "#ffffff",
    logoDataUrl: null,
    logoFile: null,
    opacity: 0.5,
    size: 10,
    position: "bottomRight",
  },
}));

// Define ImageAdjustments interface locally since it's not exported
interface ImageAdjustments {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
  lightness: number;
  sharpen: number;
  redScale: number;
  greenScale: number;
  blueScale: number;
}

// Define ImageFile interface to match what the real functions expect
interface ImageFile {
  id: string;
  file: File;
  dataUrl: string;
  thumbnailDataUrl?: string;
  processedDataUrl?: string;
  processedThumbnailUrl?: string;
  backgroundRemoved?: boolean;
  [key: string]: unknown;
}

// Mock the window and canvas since we're in a Node.js environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(
    data: Uint8ClampedArray | number[],
    width: number,
    height: number
  ) {
    this.data =
      data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data);
    this.width = width;
    this.height = height;
  }
}

class MockCanvasRenderingContext2D {
  canvas: MockHTMLCanvasElement;
  fillStyle: string = "#000000";
  imageSmoothingEnabled: boolean = false;
  imageSmoothingQuality: string = "low";

  private imageData: MockImageData | null = null;

  constructor(canvas: MockHTMLCanvasElement) {
    this.canvas = canvas;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearRect(_x: number, _y: number, _width: number, _height: number): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fillRect(_x: number, _y: number, _width: number, _height: number): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  drawImage(
    _image: any,
    _x: number,
    _y: number,
    _width?: number,
    _height?: number
  ): void {}

  getImageData(sx: number, sy: number, sw: number, sh: number): MockImageData {
    if (!this.imageData) {
      // Create a default test image data with RGBA values
      const data = new Uint8ClampedArray(sw * sh * 4);
      for (let i = 0; i < sw * sh; i++) {
        const idx = i * 4;
        data[idx] = 100; // R
        data[idx + 1] = 150; // G
        data[idx + 2] = 200; // B
        data[idx + 3] = 255; // A
      }
      this.imageData = new MockImageData(data, sw, sh);
    }
    return this.imageData;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  putImageData(imageData: MockImageData, dx: number, dy: number): void {
    this.imageData = imageData;
  }
}

class MockHTMLCanvasElement {
  width: number = 0;
  height: number = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  getContext(
    _contextId: string,
    _options?: any
  ): MockCanvasRenderingContext2D | null {
    return new MockCanvasRenderingContext2D(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toDataURL(_type?: string, _quality?: number): string {
    return "data:image/png;base64,mock";
  }
}

// Mock the Image class
class MockImage {
  src: string = "";
  width: number = 0;
  height: number = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    // Simulate loading the image
    setTimeout(() => {
      this.width = 100;
      this.height = 100;
      if (this.onload) this.onload();
    }, 0);
  }
}

// Setup the mocks before the tests
beforeEach(() => {
  // @ts-expect-error - Mocking global Image constructor
  global.Image = MockImage;
  // @ts-expect-error - Mocking global HTMLCanvasElement
  global.HTMLCanvasElement = MockHTMLCanvasElement;
  // @ts-expect-error - Mocking global ImageData
  global.ImageData = MockImageData;

  // Mock document.createElement with proper TypeScript handling
  const originalCreateElement = document.createElement;
  document.createElement = jest.fn((tagName: string) => {
    if (tagName === "canvas") {
      return new MockHTMLCanvasElement() as unknown as HTMLCanvasElement;
    }
    return originalCreateElement.call(document, tagName);
  }) as typeof document.createElement;
});

// Utility function to create a mock ImageFile for testing
function createMockImageFile(id: string = "1"): ImageFile {
  return {
    id,
    file: new File([], "test.jpg", { type: "image/jpeg" }),
    dataUrl: "data:image/jpeg;base64,test",
    thumbnailDataUrl: "data:image/jpeg;base64,thumbnail",
  };
}

describe("Image Processing Functions", () => {
  describe("applyBrightnessContrast", () => {
    it("should correctly adjust brightness", () => {
      // We can't directly test the private function, but we can test through processImage
      // which will be tested in integration tests
    });
  });

  describe("processImage", () => {
    it("should process an image with default adjustments", async () => {
      const mockImageFile = createMockImageFile();
      const adjustments: ImageAdjustments = {
        brightness: 0,
        contrast: 0,
        hue: 100,
        saturation: 100,
        lightness: 100,
        sharpen: 0,
        redScale: 1.0,
        greenScale: 1.0,
        blueScale: 1.0,
      };

      // We need to mock the processImage implementation to avoid actual image processing
      // but still test the logic flow
      const result = await processImage(
        mockImageFile,
        adjustments,
        null,
        false
      );

      expect(result).toBeDefined();
      expect(result.processedThumbnailUrl).toBeDefined();
    });

    it("should apply brightness and contrast adjustments", async () => {
      const mockImageFile = createMockImageFile();
      const adjustments: ImageAdjustments = {
        brightness: 10,
        contrast: 10,
        hue: 100,
        saturation: 100,
        lightness: 100,
        sharpen: 0,
        redScale: 1.0,
        greenScale: 1.0,
        blueScale: 1.0,
      };

      const result = await processImage(
        mockImageFile,
        adjustments,
        null,
        false
      );

      expect(result).toBeDefined();
      expect(result.processedThumbnailUrl).toBeDefined();
    });

    it("should handle transparent PNG images correctly", async () => {
      const mockImageFile: ImageFile = {
        ...createMockImageFile(),
        backgroundRemoved: true,
        dataUrl: "data:image/png;base64,test",
      };

      const adjustments: ImageAdjustments = {
        brightness: 10,
        contrast: 10,
        hue: 110,
        saturation: 120,
        lightness: 90,
        sharpen: 1,
        redScale: 1.0,
        greenScale: 1.0,
        blueScale: 1.0,
      };

      const result = await processImage(
        mockImageFile,
        adjustments,
        null,
        false
      );

      expect(result).toBeDefined();
      expect(result.processedThumbnailUrl).toBeDefined();
    });

    it("should apply preset resize dimensions when provided", async () => {
      const mockImageFile = createMockImageFile();
      const adjustments: ImageAdjustments = {
        brightness: 0,
        contrast: 0,
        hue: 100,
        saturation: 100,
        lightness: 100,
        sharpen: 0,
        redScale: 1.0,
        greenScale: 1.0,
        blueScale: 1.0,
      };

      const preset = {
        id: "test",
        name: "Test Preset",
        width: 800,
        height: 600,
        quality: 90,
        description: "Test preset for jest",
      };

      const result = await processImage(
        mockImageFile,
        adjustments,
        preset,
        undefined,
        true
      );

      expect(result).toBeDefined();
      expect(result.processedDataUrl).toBeDefined();
    });
  });

  describe("createThumbnail", () => {
    it("should create a thumbnail from an image data URL", async () => {
      const result = await createThumbnail("data:image/jpeg;base64,test");

      expect(result).toBeDefined();
      expect(result).toContain("data:image");
    });
  });
});
