import { simpleLogger } from '../utils/logger';
import { Keyword } from '../utils/types';

const logger = simpleLogger('GoogleTrends');

// Store the API module once loaded to avoid multiple imports
let googleTrendsApi: typeof import('google-trends-api') | null = null;

// A list of trending keywords by category for fallback
const TRENDING_KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  // E-commerce general
  'ecommerce': [
    'free-shipping', 'limited-time-offer', 'exclusive-deal', 'bestseller',
    'top-rated', 'fast-delivery', 'flash-sale', 'new-arrival', 'trending-now', 'discount'
  ],
  // Fashion
  'fashion': [
    'sustainable-fashion', 'eco-friendly', 'organic-cotton', 'recycled-materials',
    'minimalist-design', 'athleisure', 'capsule-wardrobe', 'vintage-inspired',
    'handcrafted', 'limited-edition'
  ],
  // Electronics
  'electronics': [
    'wireless-charging', 'smart-home', 'noise-cancelling', 'waterproof', 
    'ultralight', 'foldable', 'energy-efficient', 'voice-controlled',
    'high-resolution', 'bluetooth-enabled'
  ],
  // Home & Garden
  'home': [
    'space-saving', 'multifunctional', 'ergonomic', 'scandinavian-design',
    'mid-century-modern', 'handwoven', 'natural-materials', 'air-purifying',
    'storage-solution', 'indoor-garden'
  ],
  // Beauty
  'beauty': [
    'cruelty-free', 'vegan-friendly', 'paraben-free', 'natural-ingredients',
    'dermatologist-tested', 'anti-aging', 'hydrating', 'fragrance-free',
    'long-lasting', 'spf-protection'
  ],
  // Outdoors
  'outdoors': [
    'ultralight', 'weather-resistant', 'quick-dry', 'breathable',
    'packable', 'insulated', 'adjustable', 'sustainably-made',
    'all-terrain', 'multipurpose'
  ]
};

// Current seasonal trends (would be updated regularly in a real implementation)
const SEASONAL_TRENDS: string[] = [
  'summer-ready', 'beach-essential', 'travel-friendly', 'back-to-school',
  'gift-idea', 'holiday-special', 'fathers-day', 'mothers-day', 
  'graduation-gift', 'anniversary-present'
];

// General trending e-commerce terms
const GENERAL_TRENDS: string[] = [
  'best-selling', 'highest-rated', 'customer-favorite', 'editor-choice',
  'affordable-luxury', 'premium-quality', 'budget-friendly', 'professional-grade',
  'must-have', 'popular-now'
];

/**
 * Helper function to get random items from an array
 */
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Analyzes a product description to identify relevant categories
 */
function analyzeDescription(description: string): string[] {
  logger.log(`Analyzing description: "${description}"`);
  
  const lowercaseDesc = description.toLowerCase();
  const categories: string[] = [];
  
  const categoryKeywords: Record<string, string[]> = {
    'fashion': ['shirt', 'dress', 'shoes', 'hat', 'jacket', 'jeans', 'clothing', 'wear', 'apparel', 'fashion'],
    'electronics': ['phone', 'laptop', 'computer', 'gadget', 'charger', 'device', 'camera', 'tech', 'electronic', 'digital'],
    'home': ['furniture', 'decor', 'chair', 'table', 'kitchen', 'bedroom', 'living', 'home', 'house', 'garden'],
    'beauty': ['makeup', 'skincare', 'cream', 'lotion', 'beauty', 'cosmetic', 'face', 'hair', 'shampoo', 'perfume'],
    'outdoors': ['outdoor', 'hiking', 'camping', 'adventure', 'backpack', 'tent', 'grill', 'sports', 'bike', 'fishing']
  };
  
  // Check which categories the description might belong to
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some(keyword => lowercaseDesc.includes(keyword))) {
      categories.push(category);
    }
  });
  
  // Always include ecommerce as a general category
  categories.push('ecommerce');
  
  logger.log(`Identified categories: ${categories.join(', ')}`);
  return categories;
}

/**
 * Generate simulated trending keywords based on the description
 */
async function getSimulatedTrendingKeywords(description: string): Promise<string[]> {
  logger.log('Using simulated trending keywords');
  
  // Analyze the description to identify relevant categories
  const relevantCategories = analyzeDescription(description);
  const trendingKeywords: string[] = [];
  
  // Add category-specific trending keywords
  relevantCategories.forEach(category => {
    const categoryKeywords = TRENDING_KEYWORDS_BY_CATEGORY[category] || [];
    // Add 3 random keywords from each relevant category
    const selectedKeywords = getRandomItems(categoryKeywords, 3);
    logger.log(`Selected ${selectedKeywords.length} keywords from category '${category}'`);
    trendingKeywords.push(...selectedKeywords);
  });
  
  // Add some seasonal trends
  const seasonalKeywords = getRandomItems(SEASONAL_TRENDS, 2);
  logger.log(`Added seasonal trends: ${seasonalKeywords.join(', ')}`);
  trendingKeywords.push(...seasonalKeywords);
  
  // Add some general e-commerce trends
  const generalKeywords = getRandomItems(GENERAL_TRENDS, 2);
  logger.log(`Added general trends: ${generalKeywords.join(', ')}`);
  trendingKeywords.push(...generalKeywords);
  
  // Remove duplicates and return
  const uniqueKeywords = [...new Set(trendingKeywords)];
  logger.log(`Final simulated keywords (${uniqueKeywords.length}): ${uniqueKeywords.join(', ')}`);
  return uniqueKeywords;
}

/**
 * Dynamically imports the Google Trends API client-side only
 * This prevents server-side rendering issues with Node.js modules
 */
async function getGoogleTrendsApi(): Promise<typeof import('google-trends-api') | null> {
  // Return cached module if already loaded
  if (googleTrendsApi) {
    return googleTrendsApi;
  }
  
  // Only run in browser environment
  if (typeof window === 'undefined') {
    logger.warn('Cannot load Google Trends API in server environment');
    return null;
  }
  
  try {
    // Dynamic import for client-side only
    const importedModule = await import('google-trends-api');
    googleTrendsApi = importedModule;
    logger.log('Google Trends API module loaded successfully');
    return importedModule;
  } catch (error) {
    logger.error(`Failed to load Google Trends API: ${error}`);
    return null;
  }
}

/**
 * Fetches real trending keywords from Google Trends API
 * @param category The category to get trending keywords for
 * @param geo The geographic location to get trends for (default: 'US')
 * @param limit The maximum number of keywords to return
 * @returns Array of trending keywords or null if an error occurs
 */
async function getRealTrendingKeywords(
  category: string,
  geo: string = 'US',
  limit: number = 5
): Promise<Keyword[] | null> {
  try {
    logger.log(`Fetching real trending keywords for category: ${category}, geo: ${geo}`);
    
    // Get the API module
    const googleTrends = await getGoogleTrendsApi();
    if (!googleTrends) {
      logger.warn('Google Trends API not available, skipping real data fetch');
      return null;
    }
    
    // Map general categories to Google Trends category IDs
    const categoryMapping: Record<string, number> = {
      'technology': 5, // Computers & Electronics
      'electronics': 5, // Computers & Electronics
      'fashion': 185, // Apparel
      'food': 71, // Food & Drink
      'health': 45, // Health
      'beauty': 44, // Beauty & Fitness
      'travel': 67, // Travel
      'sports': 20, // Sports
      'entertainment': 3, // Arts & Entertainment
      'business': 12, // Business & Industrial
      'education': 5, // Jobs & Education
      'outdoors': 20, // Sports
      'home': 11, // Home & Garden
    };
    
    // Get Google Trends category ID if available, or use a default
    const trendsCategoryId = categoryMapping[category.toLowerCase()] || 0;
    
    // Set a timeout for the API request
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Google Trends API request timed out')), 5000);
    });
    
    // Make the API request
    const apiPromise = googleTrends.relatedQueries({
      keyword: category,
      geo: geo,
      category: trendsCategoryId,
      hl: 'en-US',
    });
    
    // Race the API request against the timeout
    const result = await Promise.race([apiPromise, timeoutPromise]);
    
    if (!result) return null;
    
    // Parse the JSON result
    const parsedResult = JSON.parse(result) as import('google-trends-api').RelatedQueriesResults;
    
    // Extract the related queries
    const keywords: Keyword[] = [];
    
    if (parsedResult?.default?.rankedList?.length > 0) {
      // Usually the first rankedList item contains the "top" related queries
      const rankedKeywords = parsedResult.default.rankedList[0].rankedKeyword;
      
      for (const item of rankedKeywords.slice(0, limit)) {
        keywords.push({
          keyword: item.query,
          score: item.value || 0,
        });
      }
    }
    
    logger.log(`Found ${keywords.length} real trending keywords for category: ${category}`);
    
    return keywords.length > 0 ? keywords : null;
  } catch (error) {
    logger.error(`Error fetching real trending keywords: ${error}`);
    return null;
  }
}

/**
 * Gets trending keywords related to a product description
 * Attempts to use real Google Trends API first, falls back to simulated data
 */
export async function getTrendingKeywords(description: string): Promise<string[]> {
  logger.log(`Getting trending keywords for: "${description}"`);
  
  try {
    // Analyze description to identify relevant categories
    const categories = analyzeDescription(description);
    
    // Try to get real trending keywords for each identified category
    for (const category of categories) {
      const realKeywords = await getRealTrendingKeywords(category);
      
      // If we got real keywords, format and return them
      if (realKeywords && realKeywords.length > 0) {
        const formattedKeywords = realKeywords.map(k => 
          k.keyword.toLowerCase().replace(/\s+/g, '-')
        );
        
        logger.log(`Using real Google Trends data for category '${category}': ${formattedKeywords.join(', ')}`);
        return formattedKeywords;
      }
    }
    
    // If we couldn't get real keywords for any category, fall back to simulated data
    logger.log('Real Google Trends data not available for any category, falling back to simulated data');
    return getSimulatedTrendingKeywords(description);
  } catch (error) {
    logger.error(`Error fetching trending keywords: ${error}`);
    // Fall back to simulated data on error
    return getSimulatedTrendingKeywords(description);
  }
} 