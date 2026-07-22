'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import BackgroundCard from '../../components/editor/BackgroundCard';

export default function BackgroundRemovalPage() {
  const t = useTranslations('BgStep');
  return (
    <ToolStandalone
      description={t('intro')}
      title={t('title')}
      howItWorksTitle={t('howItWorks.title')}
      howItWorksSteps={[
        { title: t('howItWorks.step1.title'), description: t('howItWorks.step1.description') },
        { title: t('howItWorks.step2.title'), description: t('howItWorks.step2.description') },
        { title: t('howItWorks.step3.title'), description: t('howItWorks.step3.description') },
      ]}
    >
      <BackgroundCard />
    </ToolStandalone>
  );
}
