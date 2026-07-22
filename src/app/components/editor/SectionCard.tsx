'use client';

/**
 * Uniform anatomy for every tool section in the editor sidebar:
 *
 *   Card (brutalist, accent)
 *   ├─ [Presets | Advanced] tab row   (advanced optional — same pattern
 *   │                                  as the adjustments Basic/Advanced)
 *   ├─ children(activeTab)
 *   └─ action row: Run button · Apply-to-all checkbox · busy state
 *
 * Sections stay visually identical to the existing Watermark/Adjustments
 * cards — this wrapper only standardizes the skeleton.
 */

import React, { ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import Card from '../Card';
import Loader from '../Loader';

export type SectionTab = 'presets' | 'advanced';

interface SectionCardProps {
  title: string;
  /** Render section body; receives the active tab */
  children: (tab: SectionTab) => ReactNode;
  /** Omit to render a single body without tabs */
  hasAdvanced?: boolean;
  /** Main action */
  runLabel: string;
  onRun: () => void;
  runDisabled?: boolean;
  /** Busy overlay + disabled controls */
  isBusy?: boolean;
  busyLabel?: string;
  /** Apply-to-all toggle (omit for sections where it's meaningless) */
  applyToAll?: boolean;
  onApplyToAllChange?: (value: boolean) => void;
  headerRight?: ReactNode;
  className?: string;
}

export default function SectionCard({
  title,
  children,
  hasAdvanced = false,
  runLabel,
  onRun,
  runDisabled = false,
  isBusy = false,
  busyLabel,
  applyToAll,
  onApplyToAllChange,
  headerRight,
  className = '',
}: SectionCardProps) {
  const t = useTranslations('EditorTools');
  const [tab, setTab] = useState<SectionTab>('presets');

  return (
    <Card title={title} variant="accent" className={`${className} relative`} headerRight={headerRight}>
      {isBusy && (
        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-30 rounded-md backdrop-blur-sm">
          <Loader size="md" />
          {busyLabel && (
            <p className="mt-3 text-sm font-bold text-gray-700">{busyLabel}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {applyToAll !== undefined && onApplyToAllChange && (
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={() => onApplyToAllChange(!applyToAll)}
              className="mr-2 brutalist-border w-4 h-4 appearance-none checked:bg-[#4f46e5] checked:border-[#4f46e5] relative border-2 border-black"
              style={{
                backgroundImage: applyToAll
                  ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                  : '',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              disabled={isBusy}
            />
            <span className="font-bold">{t('applyToAll')}</span>
          </label>
        )}

        {hasAdvanced && (
          <div className="border-b-2 border-black">
            <div className="flex">
              <button
                onClick={() => setTab('presets')}
                className={`py-2 px-4 font-bold ${
                  tab === 'presets' ? 'bg-primary text-white' : 'bg-white text-black'
                }`}
                disabled={isBusy}
              >
                {t('presetsTab')}
              </button>
              <button
                onClick={() => setTab('advanced')}
                className={`py-2 px-4 font-bold ${
                  tab === 'advanced' ? 'bg-primary text-white' : 'bg-white text-black'
                }`}
                disabled={isBusy}
              >
                {t('advancedTab')}
              </button>
            </div>
          </div>
        )}

        {children(tab)}

        <button
          onClick={onRun}
          disabled={runDisabled || isBusy}
          className="w-full brutalist-border px-4 py-2 font-bold uppercase bg-primary text-white disabled:opacity-40 hover:bg-primary/90"
        >
          {runLabel}
        </button>
      </div>
    </Card>
  );
}
