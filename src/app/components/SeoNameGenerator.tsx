import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import { getCaptchaToken } from '../lib/recaptcha';

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

  const handleGenerateSeoNames = async () => {
    if (globalDescription.trim() === '') return;
    
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
    <Card title="AI SEO IMAGE NAMING" className={className} variant="accent">
      <div className="space-y-4">
        <div className="brutalist-border p-3 bg-white">
          <h3 className="font-bold mb-3 text-sm uppercase">Product Description</h3>
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
              <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
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
    </Card>
  );
} 