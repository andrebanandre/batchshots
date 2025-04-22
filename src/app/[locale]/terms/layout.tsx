import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Terms of Service page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'TermsPage' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: `/terms`,
      languages: {
        'en': '/en/terms',
        'de': '/de/terms',
        'fr': '/fr/terms',
        'nl': '/nl/terms',
        'pl': '/pl/terms',
        'ru': '/ru/terms',
        'uk': '/uk/terms',
        'cs': '/cs/terms',
      },
    },
  };
}

// Basic layout component to wrap the page
export default async function TermsLayout({
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