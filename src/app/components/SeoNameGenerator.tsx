import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import ProBadge from './ProBadge';
import { useIsPro } from '../hooks/useIsPro';
import { useRouter } from 'next/navigation';
import { getCaptchaToken } from '../lib/recaptcha';
import Loader from './Loader';
import { useTranslations } from 'next-intl';
import ProDialog from './ProDialog';

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
            <h3 className="font-bold mb-3 text-sm uppercase">{t('appliedNames.title')}</h3>
            <p className="text-xs mb-3">
              {t('appliedNames.description')}
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
        <ProDialog
          onClose={() => setShowProDialog(false)}
          onUpgrade={() => router.push('/pricing')}
          featureName="AI SEO Image Naming"
          featureLimit={100}
        />
      )}
    </Card>
  );
} 