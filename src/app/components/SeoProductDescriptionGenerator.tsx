import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import ProBadge from './ProBadge';
import { useIsPro } from '../hooks/useIsPro';
import { useRouter } from 'next/navigation';
import { getCaptchaToken } from '../lib/recaptcha';
import Loader from './Loader';
import { useTranslations } from 'next-intl';
import ProDialog from './ProDialog';
import { SeoProductDescription } from '../lib/gemini';
import BrutalistSelect from './BrutalistSelect';

// Language options for the selector - popular languages + supported locales
const LANGUAGES = {
  // Currently supported locales
  en: "English",
  de: "German",
  fr: "French",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  uk: "Ukrainian",
  cs: "Czech",
  
  // Other popular languages
  es: "Spanish",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  it: "Italian",
  ar: "Arabic",
  hi: "Hindi",
  tr: "Turkish",
  id: "Indonesian",
  vi: "Vietnamese"
};

interface SeoProductDescriptionGeneratorProps {
  className?: string;
  onGenerateDescription?: (seoDescription: SeoProductDescription) => void;
  downloadWithImages?: boolean;
}

type TabType = 'content' | 'meta-categories' | 'previews';

export default function SeoProductDescriptionGenerator({
  className = '',
  onGenerateDescription,
  downloadWithImages = false
}: SeoProductDescriptionGeneratorProps) {
  const t = useTranslations('Components.SeoProductDescription');
  
  const [baseDescription, setBaseDescription] = useState('');
  const [seoDescription, setSeoDescription] = useState<SeoProductDescription | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const { isProUser, isLoading: isProLoading } = useIsPro();
  const [showProDialog, setShowProDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const router = useRouter();

  // Get current locale and set it as default language
  useEffect(() => {
    const locale = document.documentElement.lang || 'en';
    setSelectedLanguage(locale);
  }, []);

  // Convert LANGUAGES object to array format for BrutalistSelect
  const languageOptions = Object.entries(LANGUAGES).map(([code, name]) => ({
    value: code,
    label: name,
  }));

  // Fetch SEO product description from the API
  const handleGenerateDescription = async () => {
    if (baseDescription.trim() === '') return;
    
    // Check if user is PRO
    if (!isProUser && !isProLoading) {
      setShowProDialog(true);
      return;
    }
    
    setRecaptchaError(null);
    setIsGenerating(true);
    
    try {
      const token = await getCaptchaToken('seo_product_description');
      
      if (!token) {
        setRecaptchaError('reCAPTCHA verification failed. Please try again.');
        setIsGenerating(false);
        return;
      }
      
      // Call the API to generate the SEO product description
      const response = await fetch('/api/seo-product-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseDescription,
          recaptchaToken: token,
          language: selectedLanguage
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate SEO product description');
      }
      
      const data = await response.json();
      
      if (!data.seoDescription) {
        throw new Error('Invalid response from API');
      }
      
      // Update state with the generated SEO description
      setSeoDescription(data.seoDescription);
      
      // If a callback was provided, call it with the description
      if (onGenerateDescription) {
        onGenerateDescription(data.seoDescription);
      }
    } catch (error) {
      console.error('Error generating SEO product description:', error);
      setRecaptchaError('Failed to generate SEO product description. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTryFeature = () => {
    setShowProDialog(false);
    router.push('/seo-description');
  };
  
  // Copy content to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  // Download a single field as a text file
  const downloadAsText = (text: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${filename}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Download all description data as a single text file
  const downloadAllData = () => {
    if (!seoDescription) return;
    
    let content = '';
    content += `PRODUCT TITLE:\n${seoDescription.productTitle}\n\n`;
    content += `META TITLE:\n${seoDescription.metaTitle}\n\n`;
    content += `META DESCRIPTION:\n${seoDescription.metaDescription}\n\n`;
    content += `SHORT DESCRIPTION:\n${seoDescription.shortDescription}\n\n`;
    content += `LONG DESCRIPTION:\n${seoDescription.longDescription}\n\n`;
    content += `CATEGORIES:\n${seoDescription.categories.join(' > ')}\n\n`;
    content += `TAGS:\n${seoDescription.tags.join(', ')}\n\n`;
    content += `URL SLUG:\n${seoDescription.urlSlug}\n\n`;
    
    downloadAsText(content, 'seo-product-description');
  };

  return (
    <Card title={t('title')} className={className} variant="accent" headerRight={<ProBadge />}>
      <div className="space-y-4">
        <div className="brutalist-border p-3 bg-white">
          <h3 className="font-bold mb-3 text-sm uppercase">
            {t('enterDescription')} <ProBadge className="ml-1" />
          </h3>
          <div className="space-y-3">
            <div className="flex flex-col space-y-2">
              <p className="text-xs">
                {t('description')}
              </p>
              <div className="flex items-center">
                <span className="text-xs mr-2">Language:</span>
                <BrutalistSelect
                  options={languageOptions}
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  className="w-36"
                />
              </div>
            </div>
            
            <textarea
              className="w-full p-2 brutalist-border"
              rows={3}
              placeholder={t('placeholder')}
              value={baseDescription}
              onChange={(e) => setBaseDescription(e.target.value)}
              disabled={isGenerating}
            ></textarea>
            <p className="text-xs text-gray-500">
              {t('proFeature')}
            </p>
          </div>
        </div>

        <Button
          onClick={handleGenerateDescription}
          fullWidth
          variant="default"
          disabled={isGenerating || baseDescription.trim() === ''}
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

        {seoDescription && (
          <div className="space-y-4">
            {!downloadWithImages && (
              <Button 
                onClick={downloadAllData} 
                fullWidth 
                variant="secondary"
              >
                {t('downloadAll')}
              </Button>
            )}
            
            {/* Tabs - updated to match PresetsSelector styling */}
            <div className="flex border-b border-black">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2 font-bold text-sm ${activeTab === 'content' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                {t('tabs.content')}
              </button>
              <button
                onClick={() => setActiveTab('meta-categories')}
                className={`px-4 py-2 font-bold text-sm ${activeTab === 'meta-categories' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                {`${t('tabs.meta')} / ${t('tabs.categories')}`}
              </button>
              <button
                onClick={() => setActiveTab('previews')}
                className={`px-4 py-2 font-bold text-sm ${activeTab === 'previews' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                {t('tabs.previews')}
              </button>
            </div>
            
            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                {/* Product Title */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.productTitle')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.productTitle, 'productTitle')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'productTitle' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => downloadAsText(seoDescription.productTitle, 'product-title')}
                        aria-label={t('downloadAsTxt')}
                        title={t('downloadAsTxt')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{seoDescription.productTitle}</p>
                </div>
                
                {/* Short Description */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.shortDescription')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.shortDescription, 'shortDescription')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'shortDescription' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => downloadAsText(seoDescription.shortDescription, 'short-description')}
                        aria-label={t('downloadAsTxt')}
                        title={t('downloadAsTxt')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm">{seoDescription.shortDescription}</p>
                </div>
                
                {/* Long Description */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.longDescription')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.longDescription, 'longDescription')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'longDescription' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => downloadAsText(seoDescription.longDescription, 'long-description')}
                        aria-label={t('downloadAsTxt')}
                        title={t('downloadAsTxt')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-line brutalist-border p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {seoDescription.longDescription}
                  </div>
                </div>
              </div>
            )}
            
            {/* Combined Meta and Categories Tab */}
            {activeTab === 'meta-categories' && (
              <div className="space-y-4">
                {/* Meta Title */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.metaTitle')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.metaTitle, 'metaTitle')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'metaTitle' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => downloadAsText(seoDescription.metaTitle, 'meta-title')}
                        aria-label={t('downloadAsTxt')}
                        title={t('downloadAsTxt')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm">{seoDescription.metaTitle}</p>
                </div>
                
                {/* Meta Description */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.metaDescription')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.metaDescription, 'metaDescription')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'metaDescription' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => downloadAsText(seoDescription.metaDescription, 'meta-description')}
                        aria-label={t('downloadAsTxt')}
                        title={t('downloadAsTxt')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm">{seoDescription.metaDescription}</p>
                </div>
                
                {/* URL Slug */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.urlSlug')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.urlSlug, 'urlSlug')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'urlSlug' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-mono">/{seoDescription.urlSlug}</p>
                </div>

                {/* Categories */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.categories')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.categories.join(', '), 'categories')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'categories' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm">{seoDescription.categories.join(', ')}</p>
                </div>
                
                {/* Tags */}
                <div className="brutalist-border p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm uppercase">{t('sections.tags')}</h3>
                    <div className="flex space-x-2">
                      <button 
                        className="brutalist-border p-1 hover:bg-gray-100"
                        onClick={() => copyToClipboard(seoDescription.tags.join(', '), 'tags')}
                        aria-label={t('copyToClipboard')}
                        title={t('copyToClipboard')}
                      >
                        {copiedField === 'tags' ? (
                          <span className="text-xs px-1">{t('copied')}</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm">{seoDescription.tags.join(', ')}</p>
                </div>
              </div>
            )}
            
            {/* Previews Tab */}
            {activeTab === 'previews' && (
              <div className="space-y-4">
                {/* Google Search Result Preview */}
                <div className="brutalist-border p-3 bg-white">
                  <h3 className="font-bold text-sm uppercase mb-2">{t('previews.googleSearch')}</h3>
                  <div className="brutalist-border p-3">
                    <div className="space-y-1 max-w-xl">
                      <p className="text-xl text-blue-700 truncate">{seoDescription.metaTitle}</p>
                      <p className="text-sm text-green-800 truncate">www.yourstore.com/{seoDescription.urlSlug}</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{seoDescription.metaDescription}</p>
                    </div>
                  </div>
                </div>
                
                {/* E-commerce Product Preview */}
                <div className="brutalist-border p-3 bg-white">
                  <h3 className="font-bold text-sm uppercase mb-2">{t('previews.ecommerce')}</h3>
                  <div className="brutalist-border p-3">
                    <div className="space-y-3">
                      <div className="bg-gray-200 h-40 w-40 mx-auto flex items-center justify-center">
                        <span className="text-gray-500 text-xs">{t('previews.productImage')}</span>
                      </div>
                      <h2 className="text-lg font-bold">{seoDescription.productTitle}</h2>
                      <div className="flex">
                        {Array(5).fill(0).map((_, i) => (
                          <span key={i} className="text-yellow-500">★</span>
                        ))}
                        <span className="text-xs ml-1">(42)</span>
                      </div>
                      <div className="font-bold text-lg">$99.99</div>
                      <p className="text-sm">{seoDescription.shortDescription}</p>
                      <div className="flex space-x-2">
                        <div className="brutalist-border p-1 text-xs flex items-center justify-center bg-gray-100 uppercase">
                          {seoDescription.tags[0] || 'Tag 1'}
                        </div>
                        <div className="brutalist-border p-1 text-xs flex items-center justify-center bg-gray-100 uppercase">
                          {seoDescription.tags[1] || 'Tag 2'}
                        </div>
                        {seoDescription.tags.length > 2 && (
                          <div className="brutalist-border p-1 text-xs flex items-center justify-center bg-gray-100 uppercase">
                            +{seoDescription.tags.length - 2}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className="brutalist-border p-2 bg-black text-white font-bold text-sm uppercase w-full">
                          {t('previews.addToCart')}
                        </button>
                        <button className="brutalist-border p-2 bg-white text-black font-bold text-sm uppercase w-1/3">
                          {t('previews.wishlist')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pro Upgrade Dialog */}
      {showProDialog && (
        <ProDialog
          onClose={() => setShowProDialog(false)}
          onUpgrade={() => router.push('/pricing')}
          onTry={handleTryFeature}
          featureName="AI SEO Product Description"
          featureLimit={1}
        />
      )}
    </Card>
  );
} 