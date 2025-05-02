import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

// Generate metadata for the Format Conversion page
export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  // Corrected namespace
  const t = await getTranslations({ locale, namespace: 'ImageFormatConvertorPage.metadata' }); 

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords').split(', '), // Assuming keywords are comma-separated
    // Corrected paths
    alternates: {
      canonical: `/image-format-convertor`,
      languages: {
        'en': '/en/image-format-convertor',
        'de': '/de/image-format-convertor',
        'fr': '/fr/image-format-convertor',
        'nl': '/nl/image-format-convertor',
        'pl': '/pl/image-format-convertor',
        'ru': '/ru/image-format-convertor',
        'uk': '/uk/image-format-convertor',
        'cs': '/cs/image-format-convertor',
      },
    },
  };
}

// Basic layout component to wrap the page
export default function FormatConversionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
} 