'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Button from './Button';
import ProBadge from './ProBadge';

interface PricingCardProps {
  title: string;
  price: string;
  features: string[];
  isPro: boolean;
  isCurrentPlan?: boolean;
  onSelectPlan: () => void;
  buttonText: string;
  customButton?: React.ReactNode;
}

export default function PricingCard({
  title,
  price,
  features,
  isPro,
  isCurrentPlan,
  onSelectPlan,
  buttonText,
  customButton,
}: PricingCardProps) {
  const t = useTranslations('Components.PricingCard');
  
  return (
    <div className={`brutalist-border border-3 border-black p-6 ${isPro ? 'bg-yellow-50' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold uppercase">{title}</h3>
        {isPro && <ProBadge />}
      </div>
      
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        {price !== 'FREE' && <span className="text-gray-600 ml-1">{t('oneTime')}</span>}
      </div>
      
      <ul className="mb-8 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      {customButton ? (
        customButton
      ) : (
        <Button 
          variant={isPro ? "primary" : "secondary"} 
          size="lg" 
          fullWidth
          onClick={onSelectPlan}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? t('currentPlan') : buttonText}
        </Button>
      )}
    </div>
  );
} 