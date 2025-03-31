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