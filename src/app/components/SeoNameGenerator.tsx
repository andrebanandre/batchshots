import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import ProBadge from './ProBadge';
import { useIsPro } from '../hooks/useIsPro';
import { useRouter } from 'next/navigation';
import { getCaptchaToken } from '../lib/recaptcha';
import Loader from './Loader';
import { useTranslations } from 'next-intl';

export interface SeoImageName {
  id: string;
  originalName: string;
  seoName: string;
  description: string;
  extension: string;
}

interface SeoNameGeneratorProps {
  seoNames: SeoImageName[];
  onGenerateSeoNames: (description: string, recaptchaToken: string, imageCount: number) => void;
  isGenerating: boolean;
  className?: string;
  imageCount?: number;
}

export default function SeoNameGenerator({
  seoNames,
  onGenerateSeoNames,
  isGenerating,
  className = '',
  imageCount = 0,
}: SeoNameGeneratorProps) {
  const t = useTranslations('Components.SeoNameGenerator');
  const tPro = useTranslations('Components.ProUpgrade');
  
  const [globalDescription, setGlobalDescription] = useState('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const { isProUser, isLoading: isProLoading } = useIsPro();
  const [showProDialog, setShowProDialog] = useState(false);
  const router = useRouter();

  const handleGenerateSeoNames = async () => {
    if (globalDescription.trim() === '') return;
    
    // Check if user is PRO
    if (!isProUser && !isProLoading) {
      setShowProDialog(true);
      return;
    }
    
    setRecaptchaError(null);
    
    try {
      const token = await getCaptchaToken('seo_name_generation');
      
      if (!token) {
        setRecaptchaError('reCAPTCHA verification failed. Please try again.');
        return;
      }
      
      onGenerateSeoNames(globalDescription, token, imageCount);
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      setRecaptchaError('An error occurred during verification. Please try again.');
    }
  };

  const hasGeneratedNames = seoNames.length > 0;
  
  const handleTryFeature = () => {
    setShowProDialog(false);
    router.push('/seo-naming');
  };

  return (
    <Card title={t('title')} className={className} variant="accent" headerRight={<ProBadge />}>
      <div className="space-y-4">
        <div className="brutalist-border p-3 bg-white">
          <h3 className="font-bold mb-3 text-sm uppercase">{t('enterDescription')} <ProBadge className="ml-1" /></h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <p className="text-xs">
                {t('description')}
              </p>
            </div>
            
            <textarea
              className="w-full p-2 brutalist-border"
              rows={3}
              placeholder={t('placeholder')}
              value={globalDescription}
              onChange={(e) => setGlobalDescription(e.target.value)}
              disabled={isGenerating}
            ></textarea>
            <p className="text-xs text-gray-500">
              {t('proLimit')}
            </p>
          </div>
        </div>

        <Button
          onClick={handleGenerateSeoNames}
          fullWidth
          variant="default"
          disabled={isGenerating || globalDescription.trim() === ''}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <span className="mr-2">{t('generating')}</span>
              <Loader size="sm" />
            </div>
          ) : (
            t('generate')
          )}
        </Button>

        {recaptchaError && (
          <div className="mt-3 text-red-500 text-xs text-center">
            {recaptchaError}
          </div>
        )}

        {hasGeneratedNames && (
          <div className="brutalist-border p-3 bg-white mt-4">
            <h3 className="font-bold mb-3 text-sm uppercase">Applied SEO Names</h3>
            <p className="text-xs mb-3">
              Our AI has generated SEO-optimized filenames for your images.
              You can edit individual names in the image preview section.
            </p>
            <div className="overflow-auto max-h-40">
              <table className="w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-2 font-bold">{t('originalName')}</th>
                    <th className="text-left p-2 font-bold">{t('seoName')}</th>
                  </tr>
                </thead>
                <tbody>
                  {seoNames.map((name) => (
                    <tr key={name.id} className="border-t border-gray-200">
                      <td className="p-2 truncate max-w-[120px]">{name.originalName}</td>
                      <td className="p-2 text-green-600 font-medium truncate max-w-[120px]">{name.seoName}.{name.extension}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pro Upgrade Dialog */}
      {showProDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white brutalist-border border-3 border-black p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{tPro('title')}</h3>
              <button onClick={() => setShowProDialog(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <ProBadge className="mr-2" />
                <span className="font-bold">{tPro('unlock')}</span>
              </div>
              
              <p className="mb-4 text-sm">
                {tPro('description', { feature: 'AI SEO Image Naming', count: 100 })}
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
                {tPro('learnMore')}
              </Button>
              
              <Button 
                variant="secondary"
                onClick={handleTryFeature}
                className="w-full"
              >
                TRY HOW IT WORKS
              </Button>
              
              <button 
                onClick={() => setShowProDialog(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {tPro('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 