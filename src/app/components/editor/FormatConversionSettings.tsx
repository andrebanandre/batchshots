'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import PresetsSelector, {
  defaultPresets,
  type Preset,
} from '../PresetsSelector';
import type { BatchDownloadOptions } from '../../contexts/EditorToolsContext';

type OutputFormat = 'jpg' | 'png' | 'webp';

const FORMAT_OPTIONS: OutputFormat[] = ['jpg', 'png', 'webp'];
const ENCODE_FORMAT: Record<OutputFormat, BatchDownloadOptions['format']> = {
  jpg: 'jpeg',
  png: 'png',
  webp: 'webp',
};

export const defaultFormatConversionOptions: BatchDownloadOptions = {
  format: 'jpeg',
  width: null,
  height: null,
  quality: 0.9,
  maxFileSizeKb: null,
};

export default function FormatConversionSettings({
  options,
  onChange,
}: {
  options: BatchDownloadOptions;
  onChange: (options: BatchDownloadOptions) => void;
}) {
  const t = useTranslations('ImageFormatConvertorPage');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const format: OutputFormat = options.format === 'jpeg' ? 'jpg' : options.format;

  const updateFromPreset = (preset: Preset | null) => {
    onChange({
      ...options,
      width: preset?.width ?? null,
      height: preset?.height ?? null,
      quality: preset ? preset.quality / 100 : 0.9,
    });
  };

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="font-bold uppercase">{t('targetFormat.title')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() =>
                onChange({ ...options, format: ENCODE_FORMAT[option] })
              }
              aria-pressed={format === option}
              className={`brutalist-border px-4 py-3 font-bold uppercase transition-colors ${
                format === option
                  ? 'bg-primary text-white'
                  : 'bg-white text-black hover:bg-secondary'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-bold uppercase">{t('resize.title')}</legend>
        <PresetsSelector
          presets={defaultPresets}
          selectedPreset={selectedPreset}
          onSelectPreset={(presetId) => {
            if (presetId === 'custom') {
              setSelectedPreset('custom');
              return;
            }
            const nextId = selectedPreset === presetId ? null : presetId;
            setSelectedPreset(nextId);
            updateFromPreset(
              defaultPresets.find((preset) => preset.id === nextId) ?? null
            );
          }}
          onCustomSettingsChange={(settings) => {
            onChange({
              ...options,
              width: settings.width,
              height: settings.height,
              quality: settings.quality / 100,
            });
          }}
          liveCustomSettings
        />
      </fieldset>

      <label className="block space-y-2 font-bold">
        <span>Max file size (KB, optional)</span>
        <input
          type="number"
          min={1}
          value={options.maxFileSizeKb ?? ''}
          onChange={(event) =>
            onChange({
              ...options,
              maxFileSizeKb: event.target.value
                ? Number(event.target.value)
                : null,
            })
          }
          className="brutalist-border w-full bg-white px-3 py-2 font-mono font-normal"
        />
      </label>
    </div>
  );
}
