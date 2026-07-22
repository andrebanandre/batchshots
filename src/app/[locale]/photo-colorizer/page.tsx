'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import ColorizeCard from '../../components/editor/ColorizeCard';

export default function Page() {
  const t = useTranslations('ColorizeStep');
  return (
    <ToolStandalone description={t('intro')} title={t('title')}>
      <ColorizeCard />
    </ToolStandalone>
  );
}
