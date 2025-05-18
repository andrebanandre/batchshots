import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Image SEO Generation page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ImageSeoGenerationPage.metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'), // Replace with your actual domain
    alternates: {
      canonical: '/ai-image-seo-caption-generation',
      languages: { // Add other languages as needed, these are placeholders
        'en': '/en/ai-image-seo-caption-generation',
        'de': '/de/ai-image-seo-caption-generation',
        'fr': '/fr/ai-image-seo-caption-generation',
        'nl': '/nl/ai-image-seo-caption-generation',
        'pl': '/pl/ai-image-seo-caption-generation',
        'ru': '/ru/ai-image-seo-caption-generation',
        'uk': '/uk/ai-image-seo-caption-generation',
        'cs': '/cs/ai-image-seo-caption-generation',
      },
    },
  };
}

// Basic layout component to wrap the page
export default async function ImageSeoGenerationLayout({
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