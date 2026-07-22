'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import BackgroundCard from '../../components/editor/BackgroundCard';

export default function BackgroundRemovalPage() {
  const t = useTranslations('BackgroundRemovalPage');
  const tIntro = useTranslations('BgStep');
  return (
    <ToolStandalone description={tIntro('intro')} title={t('title')}>
      <BackgroundCard />
    </ToolStandalone>
  );
}
