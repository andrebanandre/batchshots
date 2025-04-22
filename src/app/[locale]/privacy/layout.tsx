import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Privacy Policy page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Await params before accessing locale
  const t = await getTranslations({ locale, namespace: 'PrivacyPage' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'), // Ensure metadataBase is set if not inherited
    alternates: {
      canonical: `/privacy`,
      languages: {
        'en': '/en/privacy',
        'de': '/de/privacy',
        'fr': '/fr/privacy',
        'nl': '/nl/privacy',
        'pl': '/pl/privacy',
        'ru': '/ru/privacy',
        'uk': '/uk/privacy',
        'cs': '/cs/privacy',
      },
    },
  };
}

// Basic layout component to wrap the page
export default async function PrivacyLayout({
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