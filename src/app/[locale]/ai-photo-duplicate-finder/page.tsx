'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import DuplicatesCard from '../../components/editor/DuplicatesCard';

export default function DuplicateFinderPage() {
  const t = useTranslations('ImageDuplicateDetectionPage');
  const tIntro = useTranslations('DedupeStep');
  return (
    <ToolStandalone description={tIntro('intro')} title={t('PageTitle')}>
      <DuplicatesCard />
    </ToolStandalone>
  );
}
