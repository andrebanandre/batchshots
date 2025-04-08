import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import ProBadge from './ProBadge';
import { useIsPro } from '../hooks/useIsPro';
import { useRouter } from 'next/navigation';
import { getCaptchaToken } from '../lib/recaptcha';
import Loader from './Loader';

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
    <Card title="AI SEO IMAGE NAMING" className={className} variant="accent" headerRight={<ProBadge />}>
      <div className="space-y-4">
        <div className="brutalist-border p-3 bg-white">
          <h3 className="font-bold mb-3 text-sm uppercase">Product Description <ProBadge className="ml-1" /></h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <p className="text-xs">
                 Enter a detailed product description to generate SEO-optimized image names.
              </p>
            </div>
            
            <textarea
              className="w-full p-2 brutalist-border"
              rows={3}
              placeholder="E.g. Black snapback hat from New Era, limited edition with discount"
              value={globalDescription}
              onChange={(e) => setGlobalDescription(e.target.value)}
              disabled={isGenerating}
            ></textarea>
            <p className="text-xs text-gray-500">
              Include key details like product type, color, brand, materials, and unique features.
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
              <span className="mr-2">GENERATING NAMES...</span>
              <Loader size="sm" />
            </div>
          ) : (
            'GENERATE SEO NAMES'
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
            <div className="text-xs bg-slate-50 p-2 brutalist-border">
              <p>✓ AI-generated SEO-optimized names with keywords</p>
              <p>✓ Search engine friendly format with improved ranking potential</p>
              <p>✓ Original file extensions preserved</p>
            </div>
          </div>
        )}
      </div>

      {/* Pro Upgrade Dialog */}
      {showProDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white brutalist-border border-3 border-black p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">UPGRADE TO PRO</h3>
              <button onClick={() => setShowProDialog(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <ProBadge className="mr-2" />
                <span className="font-bold">PRO FEATURE: AI SEO Image Naming</span>
              </div>
              
              <p className="mb-4 text-sm">
                Upgrade to PRO to unlock AI-powered SEO name generation for your images! 
                Improve your product discoverability with optimized image filenames.
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
                UPGRADE TO PRO
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
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 