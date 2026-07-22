'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import ExportCard from '../../components/editor/ExportCard';

export default function ImageFormatConvertorPage() {
  const t = useTranslations('ImageFormatConvertorPage');
  const tIntro = useTranslations('ExportStep');
  return (
    <ToolStandalone description={tIntro('intro')} title={t('title')}>
      <ExportCard />
    </ToolStandalone>
  );
}
