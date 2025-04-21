'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from './Button';
import { useTranslations } from 'next-intl';
import LanguageSelector from './LanguageSelector';
import {
  SignInButton,
  UserButton,
  useAuth,
} from '@clerk/nextjs';
import UserProStatus from './UserProStatus';
import MobileMenu from './MobileMenu';

// Simple SVG logo component
const Logo = () => (
  <svg width="190" height="40" viewBox="0 0 190 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="24" height="24" fill="#FF6B6B" />
    <rect x="10" y="3" width="24" height="24" fill="#4F46E5" />
    <text x="40" y="26" fontFamily="sans-serif" fontWeight="700" fontSize="20" fill="black">BATCH SHOTS</text>
  </svg>
);

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const t = useTranslations('Navbar');
  
  return (
    <header className="border-b-3 border-black sticky top-0 bg-white z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center" aria-label="Go to homepage">
            <Logo />
          </Link>
          <LanguageSelector />
        </div>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            {t('imageOptimizer')}
          </Link>
          <Link href="/background-removal" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            {t('removeBackgrounds')}
          </Link>
          {/* <Link href="/backgrounds" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            {t('aiBackgrounds')}
          </Link> */}
          <Link href="/pricing" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            {t('pricing')}
          </Link>
          <div className="ml-2 flex items-center space-x-2">
            {isSignedIn && (
              <div className="flex items-center gap-2">
                <UserProStatus />
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'border-3 border-black brutalist-border'
                    }
                  }}
                />
              </div>
            )}
            {!isSignedIn && (
              <SignInButton>
                <Button variant="primary" size="sm">{t('login')}</Button>
              </SignInButton>
            )}
          </div>
       
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden brutalist-border border-3 p-2"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <div className="w-6 h-0.5 bg-black mb-1.5"></div>
          <div className="w-6 h-0.5 bg-black mb-1.5"></div>
          <div className="w-6 h-0.5 bg-black"></div>
        </button>
        
        {/* Mobile Menu */}
        <MobileMenu 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
        />
      </div>
    </header>
  );
} 