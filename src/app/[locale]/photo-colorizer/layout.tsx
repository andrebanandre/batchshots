import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ColorizeStep' });

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
    keywords: t('metadata.keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: '/photo-colorizer',
      languages: {
        en: '/en/photo-colorizer',
        de: '/de/photo-colorizer',
        fr: '/fr/photo-colorizer',
        nl: '/nl/photo-colorizer',
        pl: '/pl/photo-colorizer',
        ru: '/ru/photo-colorizer',
        uk: '/uk/photo-colorizer',
        cs: '/cs/photo-colorizer',
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
