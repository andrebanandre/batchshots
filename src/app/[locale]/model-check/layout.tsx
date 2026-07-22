import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import React from 'react';

// Dev-only model compatibility harness — never indexed
export const metadata: Metadata = {
  title: 'Model Check (dev)',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ModelCheckLayout({
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
