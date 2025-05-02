import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSelector from './LanguageSelector';

export default function Footer() {
  const t = useTranslations('Footer');
  const tNavbar = useTranslations('Navbar');
  const tHome = useTranslations('Home');
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t-3 border-black py-6 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* First Column - Logo and About */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-bold uppercase mb-2">Batch Shots</h3>
            <p className="text-sm max-w-sm">
              {t('about')}
            </p>
            {/* <div className="flex space-x-4 mt-2">
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
            </div> */}
         
          </div>
          
          {/* Second Column - Quick Links */}
          <div>
            <h3 className="text-lg font-bold uppercase mb-4">{t('quickLinks')}</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/" className="hover:text-primary text-sm">{tNavbar('imageOptimizer')}</Link>
              <Link href="/background-removal" className="hover:text-primary text-sm">{tNavbar('removeBackgrounds')}</Link>
              <Link href="/add-watermark" className="hover:text-primary text-sm">{tNavbar('addWatermark')}</Link>
              {/* <Link href="/backgrounds" className="hover:text-primary text-sm">{tNavbar('aiBackgrounds')}</Link> */}
              <Link href="/pricing" className="hover:text-primary text-sm">{tNavbar('pricing')}</Link>
              <Link href="/privacy" className="hover:text-primary text-sm">{tHome('privacyPolicy')}</Link>
              <Link href="/terms" className="hover:text-primary text-sm">{tHome('termsOfUse')}</Link>
            </nav>
          </div>
          
          {/* Third Column - Tools */}
          <div>
            <h3 className="text-lg font-bold uppercase mb-4">{tNavbar('tools')}</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/background-removal" className="hover:text-primary text-sm">{tNavbar('removeBackgrounds')}</Link>
              <Link href="/add-watermark" className="hover:text-primary text-sm">{tNavbar('addWatermark')}</Link>
              <Link href="/image-format-convertor" className="hover:text-primary text-sm">{tNavbar('imageFormatConvertor')}</Link>
              <Link href="/seo-description" className="hover:text-primary text-sm">{tNavbar('seoDescription')}</Link>
              <Link href="/object-removal" className="hover:text-primary text-sm flex items-center gap-2">
                {tNavbar('objectRemoval')}
                <span className="ml-2 px-2 py-0.5 text-xs font-bold brutalist-border border-2 border-black bg-yellow-300 text-black uppercase">BETA</span>
              </Link>
            </nav>
          </div>
          
          {/* Fourth Column - Language */}
          <div className="text-right">
              <LanguageSelector />
            </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-center">
          <p>{t('copyright', { year: currentYear })}</p>
          <p className="mt-2 text-xs">{t('madeWith')}</p>
        </div>
      </div>
    </footer>
  );
} 