'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ToolStandalone from '../../components/editor/ToolStandalone';
import TextExtractTool from '../../components/editor/TextExtractTool';

export default function Page() {
  const t = useTranslations('OcrStep');
  return (
    <ToolStandalone
      description={t('intro')}
      title={t('title')}
      accept="image/*,.heic,.heif,.pdf,.docx,.pptx"
      allowDocuments
      uploadTitle={t('uploadTitle')}
      uploadDescription={t('uploadDescription')}
      uploadMoreTitle={t('addMoreFiles')}
      uploadMoreDescription={t('uploadMoreDescription')}
      getCollectionLabel={(current, max) => t('allFiles', { current, max })}
      getItemCountLabel={(count) => t('fileCount', { count })}
      maxItemsReachedTitle={t('maxFilesReached', { max: 100 })}
      loadingStatus={t('preparingFiles')}
      showDownloadZip={false}
      howItWorksTitle={t('howItWorks.title')}
      howItWorksSteps={[
        { title: t('howItWorks.step1.title'), description: t('howItWorks.step1.description') },
        { title: t('howItWorks.step2.title'), description: t('howItWorks.step2.description') },
        { title: t('howItWorks.step3.title'), description: t('howItWorks.step3.description') },
      ]}
    >
      <TextExtractTool />
    </ToolStandalone>
  );
}
