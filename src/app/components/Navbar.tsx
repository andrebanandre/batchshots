'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from './Button';

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
          <Link href="/backgrounds" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            AI BACKGROUNDS
          </Link>
          <Link href="/pricing" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            PRICING
          </Link>
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
          <Link href="/backgrounds" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            AI Backgrounds
          </Link>
          <Link href="/pricing" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            Pricing
          </Link>
          <Button variant="accent" size="sm" as="a" href="/backgrounds">TRY AI NOW</Button>
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