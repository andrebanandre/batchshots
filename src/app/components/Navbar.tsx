'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from './Button';
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import UserProStatus from './UserProStatus';

// Simple SVG logo component
const Logo = () => (
  <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="24" height="24" fill="#FF6B6B" />
    <rect x="10" y="3" width="24" height="24" fill="#4F46E5" />
    <text x="40" y="26" fontFamily="sans-serif" fontWeight="700" fontSize="20" fill="black">PICME</text>
  </svg>
);

// Mobile navigation menu
const MobileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      <div className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white p-4 w-64 shadow-brutalist">
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </div>
        <nav className="flex flex-col space-y-4">
          <Link href="/" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            IMAGE OPTIMIZER
          </Link>
          <Link href="/background-removal" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            REMOVE BACKGROUNDS
          </Link>
          <Link href="/backgrounds" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            AI BACKGROUNDS
          </Link>
          <Link href="/pricing" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            PRICING
          </Link>
          <div className="pt-4 border-t-2 border-black">
            <SignedOut>
              <div className="flex flex-col space-y-2">
                <SignInButton>
                  <Button variant="primary" size="sm" fullWidth>LOG IN</Button>
                </SignInButton>
             
              </div>
            </SignedOut>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="border-b-3 border-black sticky top-0 bg-white z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center" aria-label="Go to homepage">
          <Logo />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            Image Optimizer
          </Link>
          <Link href="/background-removal" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            Remove Backgrounds
          </Link>
          <Link href="/backgrounds" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            AI Backgrounds
          </Link>
          <Link href="/pricing" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            Pricing
          </Link>
          <div className="ml-2 flex items-center space-x-2">
            <SignedIn>
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
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <Button variant="primary" size="sm">LOG IN</Button>
              </SignInButton>
             
            </SignedOut>
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