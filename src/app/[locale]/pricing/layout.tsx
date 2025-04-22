import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Pricing page
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PricingPage' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: `/pricing`,
      languages: {
        'en': '/en/pricing',
        'de': '/de/pricing',
        'fr': '/fr/pricing',
        'nl': '/nl/pricing',
        'pl': '/pl/pricing',
        'ru': '/ru/pricing',
        'uk': '/uk/pricing',
        'cs': '/cs/pricing',
      },
    },
  };
}

// Basic layout component to wrap the page
export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 