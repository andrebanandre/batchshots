'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import TextExtractTool from '../../components/editor/TextExtractTool';

export default function Page() {
  const t = useTranslations('OcrStep');
  return (
    <ToolStandalone showToolWhenEmpty description={t('intro')} title={t('title')}>
      <TextExtractTool />
    </ToolStandalone>
  );
}
