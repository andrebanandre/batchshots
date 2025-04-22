import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Background Removal page
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const { locale } = await params; // Await params before accessing locale
  // Access the nested metadata keys
  const t = await getTranslations({ locale, namespace: 'BackgroundRemovalPage.metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: `/background-removal`,
      languages: {
        'en': '/en/background-removal',
        'de': '/de/background-removal',
        'fr': '/fr/background-removal',
        'nl': '/nl/background-removal',
        'pl': '/pl/background-removal',
        'ru': '/ru/background-removal',
        'uk': '/uk/background-removal',
        'cs': '/cs/background-removal',
      },
    },
  };
}

// Basic layout component to wrap the page
export default function BackgroundRemovalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 