import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'OcrStep' });

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
    keywords: t('metadata.keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: '/image-text-extraction',
      languages: {
        en: '/en/image-text-extraction',
        de: '/de/image-text-extraction',
        fr: '/fr/image-text-extraction',
        nl: '/nl/image-text-extraction',
        pl: '/pl/image-text-extraction',
        ru: '/ru/image-text-extraction',
        uk: '/uk/image-text-extraction',
        cs: '/cs/image-text-extraction',
      },
    },
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <>{children}</>;
}
