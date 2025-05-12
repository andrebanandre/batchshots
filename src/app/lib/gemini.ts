import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type } from '@google/genai';

// Initialize the Google Generative AI with API key
export function initGemini() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not defined in environment variables');
  }
  
  // Use the new SDK initialization with a configuration object
  return new GoogleGenAI({ apiKey: apiKey });
}

// The system prompt that instructs Gemini to generate SEO-friendly image names
export function getSeoNamesPrompt(count: number, language: string = 'en'): string {
  // Get language name for instructions
  let languageName = 'English';
  switch (language) {
    case 'cs': languageName = 'Czech'; break;
    case 'nl': languageName = 'Dutch'; break;
    case 'pl': languageName = 'Polish'; break;
    case 'uk': languageName = 'Ukrainian'; break;
    case 'ru': languageName = 'Russian'; break;
    case 'de': languageName = 'German'; break;
    case 'fr': languageName = 'French'; break;
    case 'en': languageName = 'English'; break;
  }

  // Always use English prompt but request response in specified language
  return `
You are an expert in SEO optimization for e-commerce product images. 
Your task is to generate ${count} SEO-friendly image filenames based on the user's product description.

Follow these guidelines for creating optimal SEO image names:
1. Use hyphens to separate words (e.g., "black-leather-wallet")
2. Include the most important keywords first
3. Include key product attributes (color, material, style, etc.)
4. Keep names under 60 characters
5. Use only lowercase letters, numbers, and hyphens
6. Make each name unique and optimized for search engines
7. Do not include file extensions or special characters
8. Generate exactly ${count} unique image filenames

Analyze the user's product description to create the most effective SEO image names.

IMPORTANT: Respond only in ${languageName} and return exactly ${count} names in JSON array format.
`;
}

// Function to generate SEO-friendly image names using Gemini with structured output
export async function generateSeoImageNames(
  description: string,
  count: number = 10,
  language: string = 'en'
): Promise<string[]> {
  console.log(`[Gemini] Generating ${count} SEO names for description: "${description}" in language: ${language}`);
  
  try {
    const genAI = initGemini();

    const prompt = `${getSeoNamesPrompt(count, language)}\n\nProduct description: ${description}`;
    
    console.log(`[Gemini] Sending request for ${count} names in ${language}`);
    
    // Define content generation request inline following SDK structure
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash-lite-001", // Model name at top level
      contents: [{ role: 'user', parts: [{ text: prompt }] }], // Contents at top level
      // Config parameters are nested within a 'config' object
      config: { 
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: 'SEO-friendly image filename',
          },
          description: `Array of ${count} SEO-friendly image filenames`,
        },
        // Safety settings are also nested within 'config'
        safetySettings: [ 
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      }
    });
    
    // Access the text content using the result.text getter
    const text = result.text; 
    
    if (!text) {
      console.error('[Gemini] Received null or undefined text response');
      throw new Error('Received empty text response from Gemini API');
    }

    console.log(`[Gemini] Received response text: ${text}`);
    
    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(text);
      
      // Extract the SEO names from the response
      let seoNames: string[];
      
      if (Array.isArray(parsedResponse)) {
        // If the response is already an array, use it directly
        seoNames = parsedResponse;
        console.log(`[Gemini] Response is an array with ${seoNames.length} items`);
      } else {
        console.error(`[Gemini] Unexpected response format: ${JSON.stringify(parsedResponse)}`);
        throw new Error('Invalid response format from Gemini API');
      }
      
      console.log(`[Gemini] Successfully parsed ${seoNames.length} SEO names`);
      // Return exactly the number of names requested
      return seoNames.slice(0, count);
    } catch (parseError) {
      console.error('[Gemini] Failed to parse response as JSON:', parseError);
      console.error('[Gemini] Raw response:', text);
      throw new Error('Failed to parse Gemini response as JSON');
    }
  } catch (error) {
    console.error('[Gemini] Error generating SEO image names:', error);
    throw error;
  }
}

// The system prompt for generating SEO product descriptions
export function getSeoProductDescriptionPrompt(language: string = 'en'): string {
  // Get language name for instructions
  let languageName = 'English';
  switch (language) {
    case 'cs': languageName = 'Czech'; break;
    case 'nl': languageName = 'Dutch'; break;
    case 'pl': languageName = 'Polish'; break;
    case 'uk': languageName = 'Ukrainian'; break;
    case 'ru': languageName = 'Russian'; break;
    case 'de': languageName = 'German'; break;
    case 'fr': languageName = 'French'; break;
    case 'en': languageName = 'English'; break;
  }

  // The prompt in English with instructions to respond in the specified language
  return `
You are an expert e-commerce SEO copywriter. Your task is to generate a complete SEO product description 
based on the basic product information provided by the user.

Create a structured product description that includes:

1. Product Title (60 characters max): Descriptive and concise with primary keywords at the beginning
2. Meta Title (30-60 characters): Similar to product title but optimized for SEO
3. Meta Description (70-155 characters): Compelling summary with keywords and a call-to-action
4. Short Description (1-2 sentences): Key features and benefits with primary keywords
5. Long Description (300-500 words): Detailed information with:
   - Specifications and features
   - Usage instructions
   - Unique selling points
   - Secondary keywords and related terms
   - Structured with subheadings
6. Categories (2-3 levels): Logical product categorization hierarchy
7. Tags (5-10 keywords): Relevant attributes and keywords for searchability
8. URL Slug: Clean, descriptive URL with primary keywords separated by hyphens

Analyze the user's basic product information to create a complete, SEO-optimized description.

IMPORTANT: Respond only in ${languageName} and structure your response as a JSON object.
`;
}

// Type definition for SEO product description
export interface SeoProductDescription {
  productTitle: string;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  longDescription: string;
  categories: string[];
  tags: string[];
  urlSlug: string;
}

// Function to generate SEO product description using Gemini
export async function generateSeoProductDescription(
  baseDescription: string,
  language: string = 'en'
): Promise<SeoProductDescription> {
  console.log(`[Gemini] Generating SEO product description for: "${baseDescription}" in language: ${language}`);
  
  try {
    const genAI = initGemini();
    
    const prompt = `${getSeoProductDescriptionPrompt(language)}\n\nBasic product information: ${baseDescription}`;
    
    console.log(`[Gemini] Sending request for SEO product description in ${language}`);
    
    // Define content generation request inline following SDK structure
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash-lite-001", // Model name at top level
      contents: [{ role: 'user', parts: [{ text: prompt }] }], // Contents at top level
      // Config parameters are nested within a 'config' object
      config: { 
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productTitle: {
              type: Type.STRING,
              description: 'Descriptive product title with primary keywords (max 60 characters)'
            },
            metaTitle: {
              type: Type.STRING,
              description: 'SEO-optimized meta title (30-60 characters)'
            },
            metaDescription: {
              type: Type.STRING,
              description: 'Compelling meta description with call-to-action (70-155 characters)'
            },
            shortDescription: {
              type: Type.STRING,
              description: 'Brief product summary with key features (1-2 sentences)'
            },
            longDescription: {
              type: Type.STRING,
              description: 'Detailed product description with specifications, features, and benefits (300-500 words)'
            },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: 'Product category'
              },
              description: 'Hierarchical product categories (2-3 levels)'
            },
            tags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: 'Relevant product tag or keyword'
              },
              description: 'Relevant product tags and keywords (5-10)'
            },
            urlSlug: {
              type: Type.STRING,
              description: 'SEO-friendly URL slug with hyphens'
            }
          },
          required: ['productTitle', 'metaTitle', 'metaDescription', 'shortDescription', 'longDescription', 'categories', 'tags', 'urlSlug'],
          description: 'Complete SEO product description structure'
        },
        // Safety settings are also nested within 'config'
        safetySettings: [ 
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      }
    });

    // Access the text content using the result.text getter
    const text = result.text;

    if (!text) {
      console.error('[Gemini] Received null or undefined text response');
      throw new Error('Received empty text response from Gemini API');
    }

    console.log(`[Gemini] Received response text: ${text}`);
    
    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(text) as SeoProductDescription;
      console.log(`[Gemini] Successfully parsed SEO product description`);
      return parsedResponse;
    } catch (parseError) {
      console.error('[Gemini] Failed to parse response as JSON:', parseError);
      console.error('[Gemini] Raw response:', text);
      throw new Error('Failed to parse Gemini response as JSON');
    }
  } catch (error) {
    console.error('[Gemini] Error generating SEO product description:', error);
    throw error;
  }
} 