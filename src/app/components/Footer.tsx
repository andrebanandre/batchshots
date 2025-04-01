'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t-3 border-black py-6 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* First Column - Logo and About */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-bold uppercase mb-2">PICME</h3>
            <p className="text-sm max-w-sm">
              Professional image tools for product photographers, marketers, and e-commerce businesses.
              Simplify your workflow with our brutalist-style tools.
            </p>
            <div className="flex space-x-4 mt-2">
              <a href="https://twitter.com" className="brutalist-border p-2" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a href="https://facebook.com" className="brutalist-border p-2" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="https://instagram.com" className="brutalist-border p-2" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>
          
          {/* Second Column - Quick Links */}
          <div>
            <h3 className="text-lg font-bold uppercase mb-4">QUICK LINKS</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/" className="hover:text-primary text-sm">Image Optimizer</Link>
              <Link href="/backgrounds" className="hover:text-primary text-sm">AI Backgrounds</Link>
              <Link href="/pricing" className="hover:text-primary text-sm">Pricing</Link>
              <Link href="/privacy" className="hover:text-primary text-sm">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary text-sm">Terms of Service</Link>
            </nav>
          </div>
          
          {/* Third Column - Newsletter */}
          <div>
            <h3 className="text-lg font-bold uppercase mb-4">STAY UPDATED</h3>
            <p className="text-sm mb-4">Subscribe to our newsletter for updates, tips, and special offers.</p>
            <form className="flex flex-col space-y-3">
              <input 
                type="email" 
                placeholder="Your email" 
                className="brutalist-border p-2 w-full text-sm"
                aria-label="Email for newsletter"
              />
              <button 
                type="submit" 
                className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white hover:translate-y-[-2px] transition-transform p-2 font-bold text-sm"
              >
                SUBSCRIBE
              </button>
            </form>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-center">
          <p>© {currentYear} PICME. All rights reserved.</p>
          <p className="mt-2 text-xs">Made with ♥ by the PICME team</p>
        </div>
      </div>
    </footer>
  );
} 