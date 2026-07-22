'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import ObjectRemovalTool from '../../components/editor/ObjectRemovalTool';

export default function Page() {
  const t = useTranslations('ObjectRemoveStep');
  return (
    <ToolStandalone description={t('intro')} title={t('title')}>
      <ObjectRemovalTool />
    </ToolStandalone>
  );
}
