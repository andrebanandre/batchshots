'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import Card from '../Card';
import { useEditorTools } from '../../contexts/EditorToolsContext';
import FormatConversionSettings from './FormatConversionSettings';

export default function FormatConverterCard() {
  const t = useTranslations('ImageFormatConvertorPage');
  const { batchDownloadOptions, setBatchDownloadOptions } = useEditorTools();

  if (!batchDownloadOptions || !setBatchDownloadOptions) return null;

  return (
    <Card title={t('mainCard.title')} variant="accent" collapsible={false}>
      <FormatConversionSettings
        options={batchDownloadOptions}
        onChange={setBatchDownloadOptions}
      />
    </Card>
  );
}
