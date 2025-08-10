import React from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
// Auth removed

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}
export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const t = useTranslations('Navbar');
  
  if (!isOpen) return null;
  
  const handleLinkClick = () => {
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white p-4 w-full min-h-screen shadow-brutalist">
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </div>
        <nav className="flex flex-col space-y-4">
          <Link href="/" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('imageOptimizer')}
          </Link>
          <Link href="/ai-photo-duplicate-finder" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('aiPhotoDuplicateFinder')}
          </Link>
          <Link href="/background-removal" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('removeBackgrounds')}
          </Link>
          {/* Removed Gemini feature link */}
          <Link href="/add-watermark" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('addWatermark')}
          </Link>
          <Link href="/image-format-convertor" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('imageFormatConvertor')}
          </Link>
          {/* Removed SEO description link */}
          {/* Removed object removal */}
          {/* Pricing removed */}
          {/* Auth removed */}
        </nav>
      </div>
    </div>
  );
}