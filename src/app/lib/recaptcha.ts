// Declare the grecaptcha global to fix TypeScript errors
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

/**
 * Get a reCAPTCHA v3 token for verification
 * @param action The action name to associate with this token
 * @returns A promise that resolves to the token or null if not available
 */
export async function getCaptchaToken(action: string = "seo_name_generation"): Promise<string | null> {
  return new Promise<string | null>(resolve => {
    if (typeof window === 'undefined' || !window.grecaptcha) {
      console.error('reCAPTCHA not loaded');
      resolve(null);
      return;
    }

    window.grecaptcha.ready(async () => {
      try {
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (!siteKey) {
          console.error('NEXT_PUBLIC_RECAPTCHA_SITE_KEY not defined');
          resolve(null);
          return;
        }
        
        const token = await window.grecaptcha.execute(siteKey, {
          action: action,
        });
        
        resolve(token);
      } catch (error) {
        console.error('Error getting reCAPTCHA token:', error);
        resolve(null);
      }
    });
  });
} 