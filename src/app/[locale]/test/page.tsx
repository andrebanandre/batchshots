'use client';

import Classifier from '../../models/classifier';
import Upscaler from '../../models/upscaler';

export default function TestPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Text Classifier</h1>
        <Classifier />
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Image Upscaler</h1>
        <Upscaler />
      </div>
    </div>
  );
} 