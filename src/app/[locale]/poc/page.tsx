import React from 'react';
import UltraSharp from './UltraSharp';

export default function POCPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Image Enhancement POC</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <UltraSharp />
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <p>This is a proof of concept for image enhancement using ONNX runtime with WebGPU.</p>
        <p>Model: 4x-UltraSharp-fp16-opset17.onnx</p>
      </div>
    </div>
  );
} 