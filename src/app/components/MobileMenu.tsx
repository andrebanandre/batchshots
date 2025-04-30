import React from 'react';
import Link from 'next/link';
import Button from './Button'; // Assuming Button is in the same directory
import { useTranslations } from 'next-intl';
import {
  SignInButton,
  useAuth,
} from '@clerk/nextjs';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { isSignedIn } = useAuth();
  const t = useTranslations('Navbar');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      <div className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white p-4 w-64 shadow-brutalist">
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </div>
        <nav className="flex flex-col space-y-4">
          <Link href="/" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('imageOptimizer')}
          </Link>
          <Link href="/background-removal" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('removeBackgrounds')}
          </Link>
          <Link href="/add-watermark" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('addWatermark')}
          </Link>
          <Link href="/object-removal" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100 flex items-center gap-2">
            {t('objectRemoval')}
            <span className="ml-2 px-2 py-0.5 text-xs font-bold brutalist-border border-2 border-black bg-yellow-300 text-black uppercase">BETA</span>
          </Link>
          {/* <Link href="/backgrounds" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('aiBackgrounds')}
          </Link> */}
          <Link href="/pricing" className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('pricing')}
          </Link>
          <div className="pt-4 border-t-2 border-black">
            {!isSignedIn && (
              <div className="flex flex-col space-y-2">
                <SignInButton>
                  <Button variant="primary" size="sm" fullWidth>{t('login')}</Button>
                </SignInButton>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
} 