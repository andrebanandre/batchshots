import React from 'react';
import UltraSharp from './UltraSharp';
import MiganObjectRemoval from './MiganObjectRemoval';

export default function POCPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Image Enhancement POC</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Image Upscaling</h2>
        <UltraSharp />
        <div className="mt-4 text-sm text-gray-600">
          <p>This is a proof of concept for image upscaling using ONNX runtime with WebGPU.</p>
          <p>Models: Real-ESRGAN, UltraSharp, RealWebPhoto</p>
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Object Removal</h2>
        <MiganObjectRemoval />
        <div className="mt-4 text-sm text-gray-600">
          <p>This is a proof of concept for object removal using ONNX runtime with mask drawing.</p>
          <p>Model: migan_pipeline_v2.onnx</p>
        </div>
      </div>
    </div>
  );
} 