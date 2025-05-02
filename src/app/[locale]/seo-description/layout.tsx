import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the SEO Description page
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Await params before accessing locale
  const t = await getTranslations({ locale, namespace: 'Components.SeoDescriptionPage.metadata' }); // Use a new namespace

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: `/seo-description`,
      languages: {
        'en': '/en/seo-description',
        'de': '/de/seo-description',
        // Add other supported languages as needed
      },
    },
  };
}

// Basic layout component to wrap the page
export default async function SeoDescriptionLayout({
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