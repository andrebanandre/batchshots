'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import SeoNamesCard from '../../components/editor/SeoNamesCard';

export default function SeoCaptionPage() {
  const t = useTranslations('ImageSeoGenerationPage');
  const tIntro = useTranslations('CaptionStep');
  return (
    <ToolStandalone description={tIntro('intro')} title={t('PageTitle')}>
      <SeoNamesCard />
    </ToolStandalone>
  );
}
