'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Button from './Button';

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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!isSignedIn) {
      // Redirect to sign in if not logged in
      router.push('/sign-in');
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

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'LOADING...' : children}
    </Button>
  );
} 