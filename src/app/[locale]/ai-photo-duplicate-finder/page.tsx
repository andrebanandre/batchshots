'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import DuplicatesCard from '../../components/editor/DuplicatesCard';

export default function DuplicateFinderPage() {
  const t = useTranslations('ImageDuplicateDetectionPage');
  const tTool = useTranslations('DedupeStep');
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
      <DuplicatesCard />
    </ToolStandalone>
  );
}
