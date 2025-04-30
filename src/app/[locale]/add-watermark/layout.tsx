import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Watermark page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'WatermarkPage.metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: `/add-watermark`,
      languages: {
        'en': '/en/add-watermark',
        'de': '/de/add-watermark',
        'fr': '/fr/add-watermark',
        'nl': '/nl/add-watermark',
        'pl': '/pl/add-watermark',
        'ru': '/ru/add-watermark',
        'uk': '/uk/add-watermark',
        'cs': '/cs/add-watermark',
      },
    },
  };
}

// Basic layout component to wrap the page
export default async function WatermarkLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Resolve the locale from the params promise
  const { locale } = await params;
  // Enable static rendering
  setRequestLocale(locale);
  
  return <>{children}</>;
} 