'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import FormatConverterCard from '../../components/editor/FormatConverterCard';
import { defaultFormatConversionOptions } from '../../components/editor/FormatConversionSettings';

export default function ImageFormatConvertorPage() {
  const t = useTranslations('ImageFormatConvertorPage');
  const tIntro = useTranslations('ExportStep');
  return (
    <ToolStandalone
      description={tIntro('intro')}
      title={t('title')}
      defaultBatchDownloadOptions={defaultFormatConversionOptions}
    >
      <FormatConverterCard />
    </ToolStandalone>
  );
}
