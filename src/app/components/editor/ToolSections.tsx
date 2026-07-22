'use client';

/**
 * The OpenCV-5 tool sections stacked in the editor sidebar, in workflow
 * order. Each is a self-contained SectionCard reading the shared
 * EditorToolsContext.
 */

import React from 'react';
import DuplicatesCard from './DuplicatesCard';
import BackgroundCard from './BackgroundCard';
import SeoNamesCard from './SeoNamesCard';
import ExportCard from './ExportCard';

export default function ToolSections() {
  return (
    <>
      <DuplicatesCard />
      <BackgroundCard />
      <SeoNamesCard />
      <ExportCard />
    </>
  );
}
