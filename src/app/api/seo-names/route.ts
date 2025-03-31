import { NextRequest, NextResponse } from 'next/server';
import { generateSeoImageNames } from '../../lib/gemini';
import { getTrendingKeywords } from '../../lib/googleTrends';

export async function POST(request: NextRequest) {
  console.log('[API] Received request to /api/seo-names');
  
  try {
    const body = await request.json();
    const { description } = body;
    
    console.log(`[API] Product description: "${description}"`);
    
    if (!description) {
      console.error('[API] Error: Description is required');
      return new NextResponse(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // First, fetch trending keywords related to the description
    console.log('[API] Fetching trending keywords');
    const trendingKeywords = await getTrendingKeywords(description);
    console.log(`[API] Found ${trendingKeywords.length} trending keywords: ${JSON.stringify(trendingKeywords)}`);
    
    // Generate SEO names using Gemini
    console.log('[API] Generating SEO names with Gemini');
    const seoNames = await generateSeoImageNames(description, trendingKeywords);
    console.log(`[API] Generated ${seoNames.length} SEO names`);
    
    // Return the SEO names along with the trending keywords that were used
    console.log('[API] Returning response');
    return new NextResponse(
      JSON.stringify({ 
        seoNames,
        trendingKeywords 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[API] Error generating SEO names:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to generate SEO names',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 