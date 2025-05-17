import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Image Duplicate Detection page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ImageDuplicateDetectionPage.metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'), // Replace with your actual domain
    alternates: {
      canonical: '/ai-photo-duplicate-finder',
      languages: { // Add other languages as needed
        'en': '/en/ai-photo-duplicate-finder',
        'de': '/de/ai-photo-duplicate-finder',
        'fr': '/fr/ai-photo-duplicate-finder',
        'nl': '/nl/ai-photo-duplicate-finder',
        'pl': '/pl/ai-photo-duplicate-finder',
        'ru': '/ru/ai-photo-duplicate-finder',
        'uk': '/uk/ai-photo-duplicate-finder',
        'cs': '/cs/ai-photo-duplicate-finder',
      },
    },
  };
}

// Basic layout component to wrap the page
export default async function ImageDuplicateDetectionLayout({
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