// Mock Next.js environment variables if needed
process.env.GOOGLE_AI_API_KEY = 'test-api-key';

// Add any global setup needed for tests
global.console = {
  ...console,
  // Uncomment to silence console output during tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
};

// Mock browser objects for testing

// Mock canvas and its context
class MockImageData {
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

class MockCanvasRenderingContext2D {
  constructor() {
    this.canvas = {
      width: 0,
      height: 0
    };
    this.fillStyle = '#000000';
    this.imageSmoothingEnabled = false;
    this.imageSmoothingQuality = 'low';
  }

  clearRect() {}
  fillRect() {}
  drawImage() {}
  
  getImageData(sx, sy, sw, sh) {
    const data = new Uint8ClampedArray(sw * sh * 4);
    for (let i = 0; i < sw * sh; i++) {
      const idx = i * 4;
      data[idx] = 100;
      data[idx + 1] = 150;
      data[idx + 2] = 200;
      data[idx + 3] = 255;
    }
    return new MockImageData(data, sw, sh);
  }
  
  putImageData() {}
}

// Mock HTMLCanvasElement
class MockHTMLCanvasElement {
  constructor() {
    this.width = 0;
    this.height = 0;
  }
  
  getContext() {
    return new MockCanvasRenderingContext2D();
  }
  
  toDataURL() {
    return 'data:image/png;base64,mock';
  }
}

// Setup global mocks
global.HTMLCanvasElement = MockHTMLCanvasElement;
global.ImageData = MockImageData;

// Mock document.createElement
document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return new MockHTMLCanvasElement();
  }
  return {};
});

// Mock window.Image
class MockImage {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.onload = null;
    this.onerror = null;
    
    // Auto-trigger the onload event
    setTimeout(() => {
      this.width = 100;
      this.height = 100;
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

global.Image = MockImage;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch for data URLs
global.fetch = jest.fn((url) => {
  if (url.startsWith('data:')) {
    return Promise.resolve({
      blob: () => Promise.resolve(new Blob(['mock-data'], { type: 'image/png' }))
    });
  }
  return Promise.reject(new Error('URL not mocked'));
});

// Mock FileReader
class MockFileReader {
  constructor() {
    this.result = null;
    this.onload = null;
    this.onerror = null;
  }
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock';
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  }
}

global.FileReader = MockFileReader;

// We need to mock canvas-specific methods only used by OpenCV.js
global.OffscreenCanvas = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  
  getContext() {
    return new MockCanvasRenderingContext2D();
  }
}; 