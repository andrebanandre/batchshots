'use client';

import React, { useState } from 'react';
import { useAuth, SignInButton } from '@clerk/nextjs';
import Button from './Button';
import Loader from './Loader';

interface BuyProButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export default function BuyProButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children = 'UPGRADE TO PRO'
}: BuyProButtonProps) {
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!isSignedIn) {
      // Use Clerk's SignInButton to trigger the sign-in flow
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
  };

  if (!isSignedIn) {
    return (
      <SignInButton>
        <Button
          variant={variant}
          size={size}
          className={className}
        >
          {children}
        </Button>
      </SignInButton>
    );
  }

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