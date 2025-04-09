"use client";

import React from 'react';
import { useLocale } from 'next-intl';
import BrutalistSelect from './BrutalistSelect';
import { useRouter } from '@/i18n/navigation';

const languages = [
  { value: 'en', label: 'English', icon: <span>🇬🇧</span> },
  { value: 'de', label: 'Deutsch', icon: <span>🇩🇪</span> },
];

export default function LanguageSelector() {
  const currentLocale = useLocale();
  const router = useRouter();
  
  const handleLanguageChange = (locale: string) => {
    // Always redirect to the root path with the new locale
    router.push('/', { locale });
  };

  return (
    <BrutalistSelect
      options={languages}
      value={currentLocale}
      onChange={handleLanguageChange}
      className="w-40"
    />
  );
} 