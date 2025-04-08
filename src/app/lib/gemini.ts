import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentRequest, SchemaType } from '@google/generative-ai';

// Initialize the Google Generative AI with API key
export function initGemini() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not defined in environment variables');
  }
  
  return new GoogleGenerativeAI(apiKey);
}

// The system prompt that instructs Gemini to generate SEO-friendly image names
export function getSeoNamesPrompt(count: number): string {
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
`;
}

// Function to generate SEO-friendly image names using Gemini with structured output
export async function generateSeoImageNames(
  description: string,
  count: number = 10
): Promise<string[]> {
  console.log(`[Gemini] Generating ${count} SEO names for description: "${description}"`);
  
  try {
    const genAI = initGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `${getSeoNamesPrompt(count)}\n\nProduct description: ${description}`;
    
    console.log(`[Gemini] Sending request with responseSchema for ${count} names`);
    
    // Define content generation request with proper types
    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
            description: 'SEO-friendly image filename',
          },
          description: `Array of ${count} SEO-friendly image filenames`,
        },
      },
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
    };
    
    // Request using proper responseSchema
    const result = await model.generateContent(request);
    
    const response = await result.response;
    const text = response.text();
    
    console.log(`[Gemini] Received response: ${text}`);
    
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