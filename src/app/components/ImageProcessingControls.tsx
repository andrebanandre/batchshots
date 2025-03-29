import React from 'react';
import Card from './Card';
import Button from './Button';

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  redScale: number;
  greenScale: number;
  blueScale: number;
}

interface ImageProcessingControlsProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: ImageAdjustments) => void;
  onProcessImages: () => void;
  onReset: () => void;
  onDownload: () => void;
  className?: string;
}

export default function ImageProcessingControls({
  adjustments,
  onAdjustmentsChange,
  onProcessImages,
  onReset,
  onDownload,
  className = '',
}: ImageProcessingControlsProps) {
  const handleSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    property: keyof ImageAdjustments
  ) => {
    const value = parseFloat(e.target.value);
    onAdjustmentsChange({
      ...adjustments,
      [property]: value,
    });
  };

  return (
    <Card title="IMAGE ADJUSTMENTS" className={className} variant="accent">
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="brightness" className="block mb-1 font-bold">
              BRIGHTNESS: {adjustments.brightness}
            </label>
            <input
              id="brightness"
              type="range"
              min="-100"
              max="100"
              value={adjustments.brightness}
              onChange={(e) => handleSliderChange(e, 'brightness')}
              className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>

          <div>
            <label htmlFor="contrast" className="block mb-1 font-bold">
              CONTRAST: {adjustments.contrast}
            </label>
            <input
              id="contrast"
              type="range"
              min="-100"
              max="100"
              value={adjustments.contrast}
              onChange={(e) => handleSliderChange(e, 'contrast')}
              className="w-full brutalist-border bg-white h-4 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2">WHITE BALANCE</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="redScale" className="block mb-1 text-sm">
                RED: {adjustments.redScale.toFixed(1)}
              </label>
              <input
                id="redScale"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={adjustments.redScale}
                onChange={(e) => handleSliderChange(e, 'redScale')}
                className="w-full brutalist-border p-1 bg-white"
              />
            </div>
            <div>
              <label htmlFor="greenScale" className="block mb-1 text-sm">
                GREEN: {adjustments.greenScale.toFixed(1)}
              </label>
              <input
                id="greenScale"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={adjustments.greenScale}
                onChange={(e) => handleSliderChange(e, 'greenScale')}
                className="w-full brutalist-border p-1 bg-white"
              />
            </div>
            <div>
              <label htmlFor="blueScale" className="block mb-1 text-sm">
                BLUE: {adjustments.blueScale.toFixed(1)}
              </label>
              <input
                id="blueScale"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={adjustments.blueScale}
                onChange={(e) => handleSliderChange(e, 'blueScale')}
                className="w-full brutalist-border p-1 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button onClick={onReset}>RESET</Button>
          <Button onClick={onProcessImages} variant="secondary">
            PROCESS
          </Button>
          <Button
            onClick={onDownload}
            fullWidth
            className="col-span-2"
            variant="accent"
          >
            DOWNLOAD ALL
          </Button>
        </div>
      </div>
    </Card>
  );
} 