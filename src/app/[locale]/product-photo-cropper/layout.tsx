import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CropStep' });

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
    keywords: t('metadata.keywords'),
    metadataBase: new URL('https://batchshots.com'),
    alternates: {
      canonical: '/product-photo-cropper',
      languages: {
        en: '/en/product-photo-cropper',
        de: '/de/product-photo-cropper',
        fr: '/fr/product-photo-cropper',
        nl: '/nl/product-photo-cropper',
        pl: '/pl/product-photo-cropper',
        ru: '/ru/product-photo-cropper',
        uk: '/uk/product-photo-cropper',
        cs: '/cs/product-photo-cropper',
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
