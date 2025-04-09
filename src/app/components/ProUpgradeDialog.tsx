'use client';

import React from 'react';
import Button from './Button';
import ProBadge from './ProBadge';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface ProUpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  feature?: string;
  maxImagesCount?: number;
}

export default function ProUpgradeDialog({
  isOpen,
  onClose,
  title,
  feature = "Batch Processing",
  maxImagesCount = 100
}: ProUpgradeDialogProps) {
  const t = useTranslations('Components.ProUpgrade');
  const router = useRouter();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white brutalist-border border-3 border-black p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title || t('title')}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <ProBadge className="mr-2" />
            <span className="font-bold">{t('unlock')}</span>
          </div>
          
          <p className="mb-4 text-sm">
            {t('description', { feature, count: maxImagesCount })}
          </p>
          
          <div className="brutalist-border p-3 bg-yellow-50 mb-4">
            <p className="font-bold text-center mb-2">ONE-TIME PAYMENT</p>
            <p className="text-3xl font-bold text-center">$19.99</p>
            <p className="text-center text-sm text-gray-600">No subscription, lifetime access</p>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            variant="primary"
            onClick={() => router.push('/pricing')}
            className="w-full"
          >
            {t('learnMore')}
          </Button>
          
          <button 
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
} 