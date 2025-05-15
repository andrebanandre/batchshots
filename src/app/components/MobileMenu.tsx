import React from 'react';
import Link from 'next/link';
import Button from './Button'; // Assuming Button is in the same directory
import { useTranslations } from 'next-intl';
import {
  SignInButton,
  SignOutButton,
  useAuth,
  UserButton,
} from '@clerk/nextjs';
import { neobrutalism } from '@clerk/themes';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}
export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { isSignedIn } = useAuth();
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
          <Link href="/background-removal" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('removeBackgrounds')}
          </Link>
          <Link href="/add-watermark" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('addWatermark')}
          </Link>
          <Link href="/image-format-convertor" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('imageFormatConvertor')}
          </Link>
          <Link href="/seo-description" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('seoDescription')}
          </Link>
          <Link href="/object-removal" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100 flex items-center gap-2">
            {t('objectRemoval')}
            <span className="ml-2 px-2 py-0.5 text-xs font-bold brutalist-border border-2 border-black bg-yellow-300 text-black uppercase">BETA</span>
          </Link>
          <Link href="/pricing" onClick={handleLinkClick} className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100">
            {t('pricing')}
          </Link>
          <div className="pt-4 border-t-2 border-black">
            {!isSignedIn && (
              <div className="flex flex-col space-y-2">
                <SignInButton>
                  <Button variant="primary" size="sm" fullWidth onClick={handleLinkClick}>{t('login')}</Button>
                </SignInButton>
              </div>
            )}
            {isSignedIn && (
                              <SignOutButton>

              <div className="flex items-center justify-between py-2 px-4 brutalist-border text-lg font-bold cursor-pointer" onClick={handleLinkClick}>
                <span>{t('logout', { defaultValue: 'Logout' })}</span>
              
                <UserButton
                  appearance={{
                    baseTheme: neobrutalism,
                    elements: {
                      userButtonAvatarBox: 'w-10 h-10 border-2 border-black brutalist-border',
                      userButtonPopoverCard: 'brutalist-border border-3 border-black',
                    },
                  }}
                />
              </div>
              </SignOutButton>
            )}
            
          </div>
        </nav>
      </div>
    </div>
  );
}