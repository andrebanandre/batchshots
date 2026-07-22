'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import AutoCropCard from '../../components/editor/AutoCropCard';

export default function Page() {
  const t = useTranslations('CropStep');
  return (
    <ToolStandalone description={t('intro')} title={t('title')}>
      <AutoCropCard />
    </ToolStandalone>
  );
}
