'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function CookieConsent() {
  const t = useTranslations('CookieConsent');
  const [showConsent, setShowConsent] = useState<boolean>(false);

  // Check if user has already consented on mount
  useEffect(() => {
    const hasConsented = localStorage.getItem('cookie-consent');
    if (!hasConsented) {
      // Add a small delay to prevent it from appearing immediately on page load
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle consent acceptance
  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowConsent(false);
  };

  // Handle consent rejection
  const handleReject = () => {
    // Store rejection but still hide the banner
    localStorage.setItem('cookie-consent', 'rejected');
    setShowConsent(false);
  };

  // Handle close (same as reject)
  const handleClose = () => {
    handleReject();
  };

  if (!showConsent) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in-up">
      <div className="brutalist-border border-3 border-black bg-white p-4 shadow-brutalist">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-bold">{t('title')}</h3>
            <button 
              onClick={handleClose}
              className="h-5 w-5 flex items-center justify-center text-xs font-bold hover:text-primary"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          
          <p className="text-xs">{t('message')}</p>
          
          <div className="text-xs flex gap-2 items-center">
            <Link href="/privacy" className="hover:text-primary underline">
              {t('privacyLink')}
            </Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-primary underline">
              {t('termsLink')}
            </Link>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleReject}
              className="brutalist-border border-2 border-black px-3 py-1 text-xs hover:bg-gray-100 uppercase font-mono"
            >
              {t('rejectButton')}
            </button>
            <button
              onClick={handleAccept}
              className="brutalist-border border-2 border-black bg-primary text-white px-3 py-1 text-xs hover:bg-primary/80 uppercase font-mono"
            >
              {t('acceptButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 