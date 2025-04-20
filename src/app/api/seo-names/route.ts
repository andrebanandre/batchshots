

import { NextRequest, NextResponse } from 'next/server';
import { generateSeoImageNames } from '../../lib/gemini';

// Define CaptchaData type for response typing
type CaptchaData =
  | {
      success: true;
      challenge_ts: string;
      hostname: string;
      score: number;
      action: string;
    }
  | {
      success: false;
      "error-codes": string[];
    };

// Function to verify reCAPTCHA token using Google's siteverify API
async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      console.error('[API] RECAPTCHA_SECRET_KEY is not defined in environment variables');
      return false;
    }
    
    // Create siteverify URL with parameters
    const url = new URL("https://www.google.com/recaptcha/api/siteverify");
    url.searchParams.append("secret", secretKey);
    url.searchParams.append("response", token);

    // Send verification request
    const response = await fetch(url, { method: "POST" });
    
    if (!response.ok) {
      console.error('[API] reCAPTCHA verification failed:', response.statusText);
      return false;
    }

    const captchaData: CaptchaData = await response.json();
    console.log('[API] reCAPTCHA response:', captchaData);

    // Check if verification was successful
    if (!captchaData.success) {
      console.error('[API] reCAPTCHA verification failed:', captchaData["error-codes"]);
      return false;
    }

    // Get the risk score (if available)
    const score = 'score' in captchaData ? captchaData.score : 0;
    console.log(`[API] reCAPTCHA score: ${score}`);

    // Consider a score >= 0.5 as passing verification (adjust as needed)
    return score >= 0.5;
    
  } catch (error) {
    console.error('[API] Error verifying reCAPTCHA:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('[API] Received request to /api/seo-names');
  
  try {
    const body = await request.json();
    const { description, recaptchaToken, imageCount, language } = body;
    
    console.log(`[API] Product description: "${description}"`);
    console.log(`[API] Image count: ${imageCount}`);
    console.log(`[API] Language: ${language || 'en (default)'}`);
    
    if (!description) {
      console.error('[API] Error: Description is required');
      return new NextResponse(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!recaptchaToken) {
      console.error('[API] Error: reCAPTCHA token is required');
      return new NextResponse(
        JSON.stringify({ error: 'reCAPTCHA verification failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify reCAPTCHA token
    const isValidToken = await verifyRecaptcha(recaptchaToken);
    
    if (!isValidToken) {
      console.error('[API] Error: Invalid reCAPTCHA token or low score');
      return new NextResponse(
        JSON.stringify({ error: 'reCAPTCHA verification failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use imageCount from request or default to 10
    const count = imageCount && !isNaN(Number(imageCount)) ? Number(imageCount) : 10;
    
    // Generate SEO names using Gemini with language support
    console.log(`[API] Generating ${count} SEO names in language: ${language || 'en'}`);
    const seoNames = await generateSeoImageNames(description, count, language || 'en');
    console.log(`[API] Generated ${seoNames.length} SEO names`);
    
    // Return the SEO names
    console.log('[API] Returning response');
    return new NextResponse(
      JSON.stringify({ 
        seoNames
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