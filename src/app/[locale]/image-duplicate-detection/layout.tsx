import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Generate metadata for the Image Duplicate Detection page
export async function generateMetadata(/* { params }: { params: { locale: string } } */): Promise<Metadata> {
  // const { locale } = params; // Await params before accessing locale
  // For now, using static metadata. Replace with translations later.
  // const t = await getTranslations({ locale, namespace: 'ImageDuplicateDetectionPage.metadata' });

  return {
    title: "Image Duplicate Detection - Find Similar Images", // t('title'),
    description: "Easily find and group duplicate or visually similar images in your collection.", // t('description'),
    keywords: "image duplicate detection, similar images, find duplicates, image comparison", // t('keywords'),
    metadataBase: new URL('https://batchshots.com'), // Replace with your actual domain
    alternates: {
      canonical: '/image-duplicate-detection',
      languages: { // Add other languages as needed
        'en': '/en/image-duplicate-detection',
        'de': '/de/image-duplicate-detection',
        // Add other supported locales
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
  params: { locale: string }; // Removed Promise as it's resolved by Next.js
}) {
  // const { locale } = params; // Resolve the locale from the params
  // Enable static rendering
  setRequestLocale(params.locale);
  
  return <>{children}</>;
} 