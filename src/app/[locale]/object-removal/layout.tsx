import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ObjectRemoveStep' });

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
    keywords: t('metadata.keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: '/object-removal',
      languages: {
        en: '/en/object-removal',
        de: '/de/object-removal',
        fr: '/fr/object-removal',
        nl: '/nl/object-removal',
        pl: '/pl/object-removal',
        ru: '/ru/object-removal',
        uk: '/uk/object-removal',
        cs: '/cs/object-removal',
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
