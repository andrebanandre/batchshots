'use client';



import { useTranslations } from 'next-intl';
import Card from '../../components/Card';
import SeoProductDescriptionGenerator from '../../components/SeoProductDescriptionGenerator';
import { useIsPro } from '../../hooks/useIsPro';
import ProBadge from '../../components/ProBadge';
import Button from '../../components/Button';
import { useRouter } from 'next/navigation';

export default function SeoDescriptionPage() {
  const t = useTranslations('Home');
  const { isProUser } = useIsPro();
  const router = useRouter();
  
  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          AI SEO PRODUCT DESCRIPTION GENERATOR
        </h1>
        
        <div className="mb-8">
          <Card variant="default" className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold uppercase">SEO PRODUCT DESCRIPTIONS</h2>
              {isProUser && <ProBadge className="ml-2" />}
            </div>
            
            <div className="flex flex-col space-y-4">
              <div className="brutalist-border p-4 bg-white">
                <p className="font-medium mb-2">✨ <span className="font-bold">WHAT IS THIS TOOL?</span></p>
                <p className="text-sm mb-2">
                  This AI-powered tool generates complete, SEO-optimized product descriptions from basic product information. You&apos;ll get a professionally written product title, meta title, meta description, short and long descriptions, categories, tags, and URL slug.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="brutalist-border p-3 bg-white">
                  <p className="font-bold mb-1">🎯 COMPLETE SEO PACKAGE</p>
                  <p className="text-xs">Get a full set of SEO content for your product, ready to use on your e-commerce website.</p>
                </div>
                <div className="brutalist-border p-3 bg-white">
                  <p className="font-bold mb-1">🤖 AI-POWERED CONTENT</p>
                  <p className="text-xs">Our AI generates unique, compelling, and keyword-rich descriptions that help improve your search ranking.</p>
                </div>
                <div className="brutalist-border p-3 bg-white">
                  <p className="font-bold mb-1">🔍 SEO BEST PRACTICES</p>
                  <p className="text-xs">All content follows SEO best practices for character counts, keyword placement, and readability.</p>
                </div>
                <div className="brutalist-border p-3 bg-white">
                  <p className="font-bold mb-1">⚡ QUICK & EASY</p>
                  <p className="text-xs">Save hours of writing time by generating professional product descriptions in seconds.</p>
                </div>
              </div>
              
              <div className="brutalist-border p-3 bg-white">
                <div className="flex items-center mb-2">
                  <p className="font-bold">{isProUser ? t('proMode') : t('freePlan')}</p>
                  {isProUser && <ProBadge className="ml-2" />}
                </div>
                <p className="text-xs mb-1">
                  {isProUser 
                    ? "Unlimited access to the SEO product description generator with all premium features unlocked." 
                    : "Limited to trying this feature. Upgrade to PRO to generate unlimited SEO product descriptions."}
                </p>
                {!isProUser && (
                  <div className="mt-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => router.push('/pricing')}
                    >
                      {t('upgradeToPro')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          <SeoProductDescriptionGenerator className="mt-6" />
        </div>
      </div>
    </main>
  );
} 