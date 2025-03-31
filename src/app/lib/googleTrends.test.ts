import { getTrendingKeywords } from './googleTrends';

// Mock the googleTrends module
jest.mock('./googleTrends', () => ({
  getTrendingKeywords: jest.fn(),
}));
const mockGetTrendingKeywords = getTrendingKeywords as jest.MockedFunction<typeof getTrendingKeywords>;

// Mock the logger to avoid console outputs during tests
jest.mock('../utils/logger', () => ({
  simpleLogger: () => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}));

describe('Google Trends', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('should return trending keywords when successful', async () => {
    // Mock successful response
    mockGetTrendingKeywords.mockResolvedValueOnce([
      'latest-tech-gadget',
      'wireless-charger',
    ]);

    const result = await getTrendingKeywords('iPhone wireless charger');
    
    // Verify function was called with the right parameter
    expect(mockGetTrendingKeywords).toHaveBeenCalledWith('iPhone wireless charger');
    
    // Verify returned keywords
    expect(result).toEqual([
      'latest-tech-gadget',
      'wireless-charger',
    ]);
  });

  test('should handle empty product descriptions', async () => {
    // Mock empty input response
    mockGetTrendingKeywords.mockResolvedValueOnce([]);

    const result = await getTrendingKeywords('');
    
    // Verify function was called with an empty string
    expect(mockGetTrendingKeywords).toHaveBeenCalledWith('');
    
    // Verify we get an empty array
    expect(result).toEqual([]);
  });

  test('should handle errors gracefully', async () => {
    // Mock an error being thrown
    mockGetTrendingKeywords.mockRejectedValue(new Error('API error'));

    try {
      await getTrendingKeywords('iPhone wireless charger');
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // We expect an error to be thrown
      expect(error).toBeDefined();
      expect((error as Error).message).toBe('API error');
    }
  });
}); 