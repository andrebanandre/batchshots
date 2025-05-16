"use client";

import React, { useTransition } from 'react';
import { useLocale } from 'next-intl';
import BrutalistSelect from './BrutalistSelect';
import { useRouter, usePathname } from '@/i18n/navigation';

const languages = [
  { value: 'en', label: 'English', icon: <span>🇺🇸</span> },
  { value: 'de', label: 'Deutsch', icon: <span>🇩🇪</span> },
  { value: 'nl', label: 'Nederlands', icon: <span>🇳🇱</span> },
  { value: 'fr', label: 'Français', icon: <span>🇫🇷</span> },
  { value: 'pl', label: 'Polski', icon: <span>🇵🇱</span> },
  { value: 'cs', label: 'Čeština', icon: <span>🇨🇿</span> },
  { value: 'ru', label: 'Русский', icon: <span>🇷🇺</span> },
  { value: 'uk', label: 'Українська', icon: <span>🇺🇦</span> },
];

export default function LanguageSelector() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  
  const handleLanguageChange = (locale: string) => {
    // Use startTransition to avoid a full page reload
    startTransition(() => {
      // Use router.replace to avoid adding to history stack
      // and prevent full page reload
      router.replace(pathname, { locale });
    });
  };

  return (
    <BrutalistSelect
      options={languages}
      value={currentLocale}
      onChange={handleLanguageChange}
      className="w-40"
      disabled={isPending}
    />
  );
} 