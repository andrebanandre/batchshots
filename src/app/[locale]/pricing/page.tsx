'use client';



import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useIsPro } from '../../hooks/useIsPro';
import Button from '../../components/Button';
import PricingCard from '../../components/PricingCard';
import ProBadge from '../../components/ProBadge';
import Loader from '@/app/components/Loader';
import BuyProButton from '@/app/components/BuyProButton';

export default function PricingPage() {
  const router = useRouter();
  const { isProUser, isLoading } = useIsPro();
  const t = useTranslations('Pricing');
  const locale = useLocale();
  
  const handleBackToEditor = () => {
    router.push('/');
  };
  
  // Pricing features from translations
  const freeFeatures = t.raw('plans.free.features') as string[];
  const proFeatures = t.raw('plans.pro.features') as string[];
  
  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          {t('title')}
        </h1>
        
        <div className="mb-6">
          <p className="text-center text-lg max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        
        {isLoading ? (
        <div className="flex justify-center items-center">   <Loader size="sm" /></div>
        ) : isProUser ? (
          <div className="max-w-lg mx-auto text-center p-8 brutalist-border bg-white">
            <div className="flex items-center justify-center mb-4">
              <ProBadge className="mr-2" /> 
              <h2 className="text-2xl font-bold">{t('alreadyPro.title')}</h2>
            </div>
            <p className="mb-6">
              {t('alreadyPro.description')}
            </p>
            <Button variant="primary" onClick={handleBackToEditor}>
              {t('alreadyPro.backToEditor')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <PricingCard
              title={t('plans.free.title')}
              price={t('plans.free.price')}
              features={freeFeatures}
              isPro={false}
              isCurrentPlan={!isProUser}
              onSelectPlan={handleBackToEditor}
              buttonText={t('plans.free.buttonText')}
            />
            
            <PricingCard
              title={t('plans.pro.title')}
              price={t('plans.pro.price')}
              features={proFeatures}
              isPro={true}
              isCurrentPlan={isProUser}
              onSelectPlan={() => {}}
              buttonText={t('plans.pro.buttonText')}
              customButton={<BuyProButton locale={locale}>{t('plans.pro.buttonText')}</BuyProButton>}
            />
          </div>
        )}
        
        <div className="mt-12 bg-white brutalist-border p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">{t('faq.title')}</h2>
          
          <div className="space-y-4">
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">{t('faq.questions.oneTime.question')}</h3>
              <p className="text-sm">
                {t('faq.questions.oneTime.answer')}
              </p>
            </div>
            
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">{t('faq.questions.backgroundRemoval.question')}</h3>
              <p className="text-sm">
                {t('faq.questions.backgroundRemoval.answer')}
              </p>
            </div>
            
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">{t('faq.questions.imageLimits.question')}</h3>
              <p className="text-sm">
                {t('faq.questions.imageLimits.answer')}
              </p>
            </div>
            
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">{t('faq.questions.refund.question')}</h3>
              <p className="text-sm">
                {t('faq.questions.refund.answer')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 