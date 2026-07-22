'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import SeoNamesCard from '../../components/editor/SeoNamesCard';

export default function SeoCaptionPage() {
  const t = useTranslations('ImageSeoGenerationPage');
  const tTool = useTranslations('CaptionStep');
  return (
    <ToolStandalone
      description={tTool('intro')}
      title={t('PageTitle')}
      howItWorksTitle={tTool('howItWorks.title')}
      howItWorksSteps={[
        { title: tTool('howItWorks.step1.title'), description: tTool('howItWorks.step1.description') },
        { title: tTool('howItWorks.step2.title'), description: tTool('howItWorks.step2.description') },
        { title: tTool('howItWorks.step3.title'), description: tTool('howItWorks.step3.description') },
      ]}
    >
      <SeoNamesCard />
    </ToolStandalone>
  );
}
