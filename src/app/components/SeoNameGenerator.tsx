import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';

export interface SeoImageName {
  id: string;
  originalName: string;
  seoName: string;
  description: string;
  extension: string;
}

interface SeoNameGeneratorProps {
  images: {
    id: string;
    file: File;
  }[];
  seoNames: SeoImageName[];
  onGenerateSeoNames: (description: string) => void;
  onUpdateSeoName: (id: string, seoName: string) => void;
  isGenerating: boolean;
  className?: string;
  trendingKeywords?: string[];
}

export default function SeoNameGenerator({
  images,
  seoNames,
  onGenerateSeoNames,
  onUpdateSeoName,
  isGenerating,
  className = '',
  trendingKeywords = []
}: SeoNameGeneratorProps) {
  const [globalDescription, setGlobalDescription] = useState('');
  const [showTrendingKeywords, setShowTrendingKeywords] = useState(false);

  const handleGenerateSeoNames = () => {
    if (globalDescription.trim() === '') return;
    onGenerateSeoNames(globalDescription);
  };

  const hasGeneratedNames = seoNames.length > 0;

  return (
    <Card title="AI SEO IMAGE NAMING" className={className} variant="accent">
      <div className="space-y-4">
        <div className="brutalist-border p-3 bg-white">
          <h3 className="font-bold mb-3 text-sm uppercase">Product Description</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="h-8 w-8 mr-2 flex-shrink-0">
                <img 
                  src="https://seeklogo.com/images/G/google-gemini-logo-A5013883AD-seeklogo.com.png" 
                  alt="Gemini AI" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <p className="text-xs">
                <span className="font-bold">Powered by Google Gemini AI:</span> Enter a detailed product description to generate SEO-optimized image names with Google's latest AI model.
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
          variant="accent"
          disabled={isGenerating || globalDescription.trim() === ''}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <span className="mr-2">GENERATING WITH GEMINI AI...</span>
              <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
            </div>
          ) : (
            'GENERATE SEO NAMES WITH GEMINI'
          )}
        </Button>

        {hasGeneratedNames && (
          <div className="brutalist-border p-3 bg-white mt-4">
            <h3 className="font-bold mb-3 text-sm uppercase">Applied SEO Names</h3>
            <p className="text-xs mb-3">
              Google Gemini has generated SEO-optimized filenames for your images.
              You can edit individual names in the image preview section.
            </p>
            <div className="text-xs bg-slate-50 p-2 brutalist-border">
              <p>✓ AI-generated SEO-optimized names with keywords</p>
              <p>✓ Search engine friendly format with improved ranking potential</p>
              <p>✓ Original file extensions preserved</p>
              {trendingKeywords.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="h-5 w-5 mr-1 flex-shrink-0">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/2048px-Google_Chrome_icon_%28February_2022%29.svg.png" 
                        alt="Google Trends" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <button
                      onClick={() => setShowTrendingKeywords(!showTrendingKeywords)}
                      className="text-xs font-bold py-1 px-2 brutalist-border hover:bg-slate-100 text-primary flex-grow"
                    >
                      {showTrendingKeywords ? 'HIDE GOOGLE TRENDS DATA' : 'SHOW GOOGLE TRENDS DATA'}
                    </button>
                  </div>
                  
                  {showTrendingKeywords && (
                    <div className="mt-2 p-2 bg-white brutalist-border">
                      <p className="font-bold mb-1">Trending Keywords Used:</p>
                      <div className="flex flex-wrap gap-1">
                        {trendingKeywords.map((keyword, index) => (
                          <span 
                            key={index} 
                            className="inline-block px-2 py-1 bg-slate-100 text-xs rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 