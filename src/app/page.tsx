'use client';

import { useEffect } from 'react';
import { routing } from '../i18n/routing';

export default function RootRedirect() {
  useEffect(() => {
    const target = `/${routing.defaultLocale}`;
    if (window.location.pathname !== target) {
      window.location.replace(target);
    }
  }, []);
  return null;
}


