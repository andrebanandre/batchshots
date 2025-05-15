'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import Button from './Button';
import Loader from './Loader';
import { brutalistTheme } from './LoginDialog';

interface BuyProButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  locale?: string;
}

export default function BuyProButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children = 'UPGRADE TO PRO',
  locale = 'en'
}: BuyProButtonProps) {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const [isLoading, setIsLoading] = useState(false);
  
  const createCheckoutSession = useCallback(async () => {
    if (!isSignedIn) return;
    
    setIsLoading(true);
    
    try {
      // If locale is Ukrainian, fallback to Russian
      const stripeLocale = locale === 'uk' ? 'ru' : locale;

      const response = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale: stripeLocale }),
      });
      
      const session = await response.json();
      
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, locale]);
  
  // Check localStorage for pending checkout after page load
  useEffect(() => {
    const checkPendingCheckout = async () => {
      if (isSignedIn && localStorage.getItem('pendingProCheckout') === 'true') {
        localStorage.removeItem('pendingProCheckout');
        await createCheckoutSession();
      }
    };
    
    checkPendingCheckout();
  }, [isSignedIn, createCheckoutSession]);

  const handleClick = async () => {
    if (!isSignedIn) {
      // Store the checkout intent in localStorage
      localStorage.setItem('pendingProCheckout', 'true');
      
      // Open sign-in modal with no redirects to stay on the same page
      clerk.openSignIn({
        redirectUrl: window.location.href,
        afterSignInUrl: window.location.href,
        signUpUrl: window.location.href,
        appearance: brutalistTheme
      });
      
      return;
    }

    // User is already signed in, proceed with checkout
    await createCheckoutSession();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? <Loader size="sm" /> : children}
    </Button>
  );
} 