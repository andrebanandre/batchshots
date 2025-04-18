'use client'

import { NextIntlClientProvider } from 'next-intl'
import React from 'react'

interface ProvidersProps {
  children: React.ReactNode;
  intlProps: Omit<React.ComponentProps<typeof NextIntlClientProvider>, 'children'>;
}

export function Providers({ children, intlProps }: ProvidersProps) {
  return <NextIntlClientProvider {...intlProps}>{children}</NextIntlClientProvider>
} 