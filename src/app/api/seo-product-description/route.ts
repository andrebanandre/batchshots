import { NextRequest, NextResponse } from 'next/server';
import { generateSeoProductDescription } from '../../lib/gemini';
import { auth } from '@clerk/nextjs/server';
import { checkProStatus } from '../../utils/check-pro-status';

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

    // Consider a score >= 0.1 as passing verification (adjust as needed)
    return score >= 0.1;
    
  } catch (error) {
    console.error('[API] Error verifying reCAPTCHA:', error);
    return false;
  }
}


export async function POST(request: NextRequest) {
  console.log('[API] Received request to /api/seo-product-description');
  
  try {
    // Get user authentication
    const { userId } = await auth();
    
    if (!userId) {
      console.error('[API] Error: User not authenticated');
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has pro access
    const isPro = await checkProStatus(userId);
    
    // Handle daily limits for non-PRO users
    if (!isPro) {
      const cookies = request.cookies;
      const dailyUsageCookie = cookies.get('seo_daily_usage');
      const today = new Date().toDateString();
      
      let dailyUsage = { date: today, count: 0 };
      
      if (dailyUsageCookie) {
        try {
          const parsedUsage = JSON.parse(dailyUsageCookie.value);
          if (parsedUsage.date === today) {
            dailyUsage = parsedUsage;
          }
        } catch (error) {
          console.log('[API] Error parsing daily usage cookie, resetting:', error);
        }
      }
      
      // Check if daily limit exceeded (5 per day for non-PRO users)
      if (dailyUsage.count >= 5) {
        console.error('[API] Error: Daily limit exceeded for non-PRO user');
        return new NextResponse(
          JSON.stringify({ 
            error: 'Daily limit exceeded',
            message: 'Free users can generate 5 SEO descriptions per day. Upgrade to PRO for unlimited access.',
            remainingCount: 0
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const body = await request.json();
    const { baseDescription, recaptchaToken, language } = body;
    
    console.log(`[API] Base product description: "${baseDescription}"`);
    console.log(`[API] Language: ${language || 'en (default)'}`);
    
    if (!baseDescription) {
      console.error('[API] Error: Base description is required');
      return new NextResponse(
        JSON.stringify({ error: 'Base description is required' }),
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
    
    // Generate SEO product description using Gemini with language support
    console.log(`[API] Generating SEO product description in language: ${language || 'en'}`);
    const seoDescription = await generateSeoProductDescription(baseDescription, language || 'en');
    console.log(`[API] Generated SEO product description successfully`);
    
    // Update usage count for non-PRO users
    let updatedUsageCount = null;
    let remainingCount = null;
    
    if (!isPro) {
      const cookies = request.cookies;
      const dailyUsageCookie = cookies.get('seo_daily_usage');
      const today = new Date().toDateString();
      
      let dailyUsage = { date: today, count: 0 };
      
      if (dailyUsageCookie) {
        try {
          const parsedUsage = JSON.parse(dailyUsageCookie.value);
          if (parsedUsage.date === today) {
            dailyUsage = parsedUsage;
          }
        } catch (error) {
          console.log('[API] Error parsing daily usage cookie during update:', error);
        }
      }
      
      // Increment usage count
      dailyUsage.count += 1;
      updatedUsageCount = JSON.stringify(dailyUsage);
      remainingCount = Math.max(0, 5 - dailyUsage.count);
      
      console.log(`[API] Updated daily usage count: ${dailyUsage.count}/5`);
    }
    
    // Return the SEO product description with usage info
    console.log('[API] Returning response');
    const response = new NextResponse(
      JSON.stringify({ 
        seoDescription,
        ...(remainingCount !== null && { remainingCount }),
        ...(updatedUsageCount && { isPro: false })
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
    // Set updated usage cookie for non-PRO users
    if (updatedUsageCount) {
      response.cookies.set('seo_daily_usage', updatedUsageCount, {
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    return response;
  } catch (error: unknown) {
    console.error('[API] Error generating SEO product description:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to generate SEO product description',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 