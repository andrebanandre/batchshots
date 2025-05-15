'use client';

import React from 'react';
import { useClerk, SignInButton } from '@clerk/nextjs';
import Button from './Button';
import { useTranslations } from 'next-intl';

interface LoginDialogProps {
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
}

// Brutalist theme for Clerk
export const brutalistTheme = {
  variables: {
    colorPrimary: '#4f46e5',
    colorBackground: '#ffffff',
    colorText: '#000000',
    colorDanger: '#ff6b6b',
    colorInputBackground: '#ffffff',
    colorInputText: '#000000',
    fontFamily: 'monospace',
    borderRadius: '0px',
  },
  elements: {
    rootBox: {
      zIndex: 9999,
    },
    card: {
      boxShadow: '6px 6px 0 0 #000000',
      border: '2px solid #000000',
      borderRadius: '0px',
    },
    formButtonPrimary: {
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      fontFamily: 'monospace',
      border: '2px solid #000000',
      borderRadius: '0px',
      boxShadow: '3px 3px 0 0 #000000',
      textTransform: 'uppercase',
      fontWeight: 'bold',
      '&:hover': {
        backgroundColor: '#403cbd',
        transform: 'translate(-2px, -2px)',
        boxShadow: '5px 5px 0 0 #000000',
      },
    },
    formFieldInput: {
      border: '2px solid #000000',
      borderRadius: '0px',
      padding: '0.5rem',
      fontFamily: 'monospace',
      '&:focus': {
        borderColor: '#4f46e5',
        outline: 'none',
      },
    },
    formFieldLabel: {
      fontFamily: 'monospace',
      fontWeight: 'bold',
    },
    identityPreview: {
      border: '2px solid #000000',
      borderRadius: '0px',
    },
    headerTitle: {
      fontFamily: 'monospace',
      fontWeight: 'bold',
    },
    headerSubtitle: {
      fontFamily: 'monospace',
    },
    socialButtonsIconButton: {
      border: '2px solid #000000',
      borderRadius: '0px',
      backgroundColor: '#ffffff',
      boxShadow: '3px 3px 0 0 #000000',
      '&:hover': {
        transform: 'translate(-2px, -2px)',
        boxShadow: '5px 5px 0 0 #000000',
      },
    },
    footer: {
      fontFamily: 'monospace',
    },
    footerActionLink: {
      fontFamily: 'monospace',
      color: '#4f46e5',
      fontWeight: 'bold',
    },
    dividerLine: {
      backgroundColor: '#000000',
      height: '2px',
    },
    dividerText: {
      fontFamily: 'monospace',
      backgroundColor: '#ffffff',
    },
  }
};

export default function LoginDialog({
  variant = 'primary',
  size = 'sm',
  className = '',
  children,
  fullWidth = false,
  onClick,
}: LoginDialogProps) {
  const clerk = useClerk();
  const t = useTranslations('Navbar');
  
  const handleLogin = () => {
    // Call onClick handler if provided
    if (onClick) {
      onClick();
    }
    
    // Open sign-in modal with no redirects to stay on the same page
    clerk.openSignIn({
      redirectUrl: window.location.href,
      afterSignInUrl: window.location.href,
      signUpUrl: window.location.href,
      appearance: brutalistTheme
    });
  };

  return (
    <SignInButton mode="modal" appearance={brutalistTheme}>
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        fullWidth={fullWidth}
        onClick={handleLogin}
      >
        {children || t('login')}
      </Button>
    </SignInButton>
  );
} 