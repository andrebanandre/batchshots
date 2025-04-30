import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Object Removal page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ObjectRemovalPage.metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: `/object-removal`,
      languages: {
        'en': '/en/object-removal',
        'de': '/de/object-removal',
        'fr': '/fr/object-removal',
        'nl': '/nl/object-removal',
        'pl': '/pl/object-removal',
        'ru': '/ru/object-removal',
        'uk': '/uk/object-removal',
        'cs': '/cs/object-removal',
      },
    },
  };
}

// Basic layout component to wrap the page
export default async function ObjectRemovalLayout({
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