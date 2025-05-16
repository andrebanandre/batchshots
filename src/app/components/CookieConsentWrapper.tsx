'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the CookieConsent component to prevent hydration issues
const CookieConsent = dynamic(() => import('./CookieConsent'), {
  ssr: false,
});

export default function CookieConsentWrapper() {
  const [mounted, setMounted] = useState(false);

  // Only show on client-side to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <CookieConsent />;
} 