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
export async function getCaptchaToken(): Promise<string | null> {
  // reCAPTCHA removed in free static version
  return null;
}