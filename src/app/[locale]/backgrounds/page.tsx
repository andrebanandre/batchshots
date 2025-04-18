'use client';

import React, { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useRouter } from 'next/navigation';

// Sample background types/presets for the feature
const backgroundPresets = [
  {
    id: 'minimal',
    name: 'MINIMAL',
    description: 'Clean, simple backdrops perfect for product showcase',
    examples: [
      '/backgrounds/minimal-1.jpg',
      '/backgrounds/minimal-2.jpg'
    ]
  },
  {
    id: 'gradient',
    name: 'GRADIENT',
    description: 'Smooth color transitions that highlight your products',
    examples: [
      '/backgrounds/gradient-1.jpg',
      '/backgrounds/gradient-2.jpg'
    ]
  },
  {
    id: 'textured',
    name: 'TEXTURED',
    description: 'Unique textured backgrounds that add depth and character',
    examples: [
      '/backgrounds/textured-1.jpg',
      '/backgrounds/textured-2.jpg'
    ]
  },
  {
    id: 'lifestyle',
    name: 'LIFESTYLE',
    description: 'Real-world contexts showing your products in use',
    examples: [
      '/backgrounds/lifestyle-1.jpg',
      '/backgrounds/lifestyle-2.jpg'
    ]
  }
];

// Mocked sample results
const sampleResults = [
  '/backgrounds/result-1.jpg',
  '/backgrounds/result-2.jpg',
  '/backgrounds/result-3.jpg',
];

export default function BackgroundsPage() {
  const router = useRouter();

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [mockResults, setMockResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  // Handle uploading files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // In a real application, you would process the files here
    // For the mock, we'll just simulate processing and then show a paywall
    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      setIsProcessing(false);
      setShowPaywall(true);
    }, 2000);
  };
  
  // Handle generating backgrounds (mock)
  const handleGenerateBackgrounds = () => {
    if (!selectedPreset || prompt.trim() === '') return;
    
    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      // Display mock results
      setMockResults(sampleResults);
      setIsProcessing(false);
    }, 3000);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          AI REALISTIC BACKGROUNDS
        </h1>
        
        {/* Introduction Section */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-lg mb-6">
            Transform your product photos with AI-generated backgrounds that make your products pop.
            Perfect for e-commerce, social media, and professional presentations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="brutalist-border p-3 bg-white">
              <p className="font-bold mb-1">🎭 CONTEXTUAL SETTINGS</p>
              <p className="text-xs">Place your products in relevant environments that tell a story</p>
            </div>
            <div className="brutalist-border p-3 bg-white">
              <p className="font-bold mb-1">✨ PERFECT LIGHTING</p>
              <p className="text-xs">AI optimizes lighting for your product to ensure it stands out</p>
            </div>
            <div className="brutalist-border p-3 bg-white">
              <p className="font-bold mb-1">🔄 MULTIPLE OPTIONS</p>
              <p className="text-xs">Get 3 different background options for each uploaded product</p>
            </div>
          </div>
        </div>
        
        {/* Background Type Selection */}
        <Card title="STEP 1: SELECT BACKGROUND TYPE" variant="accent" className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {backgroundPresets.map(preset => (
              <div 
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`brutalist-border cursor-pointer transition-transform hover:translate-y-[-2px] ${
                  selectedPreset === preset.id
                    ? 'border-3 border-l-accent border-t-primary border-r-black border-b-black'
                    : 'border-black'
                }`}
              >
                <div className="p-3">
                  <h3 className="font-bold text-lg mb-2">{preset.name}</h3>
                  <p className="text-xs mb-3">{preset.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {preset.examples.map((example, index) => (
                      <div key={index} className="aspect-square relative bg-gray-200">
                        {/* In a real app, these would be actual images */}
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                          Example {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Upload and Prompt */}
        <Card title="STEP 2: UPLOAD YOUR PRODUCT & DESCRIBE BACKGROUND" variant="accent" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              <h3 className="font-bold mb-3">UPLOAD PRODUCT IMAGE</h3>
              <div className="brutalist-border border-dashed border-2 p-6 flex flex-col items-center justify-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mb-3">Drag & drop your product image here</p>
                <p className="text-xs mb-4">PNG, JPG, WEBP up to 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="productImage"
                />
                <label htmlFor="productImage">
                  <Button variant="default" as="span">
                    SELECT IMAGE
                  </Button>
                </label>
              </div>
            </div>
            
            {/* Prompt Section */}
            <div>
              <h3 className="font-bold mb-3">DESCRIBE YOUR IDEAL BACKGROUND</h3>
              <div className="flex flex-col h-full">
                <textarea 
                  className="brutalist-border p-3 flex-grow min-h-[150px] mb-4"
                  placeholder="Example: A minimal white table with soft shadows, two small plants in the corner, natural light from the left"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="text-xs mb-4">
                  <p className="font-bold mb-1">PRO TIPS:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Mention the surface (table, floor, etc.)</li>
                    <li>Describe the lighting (soft, dramatic, etc.)</li>
                    <li>Include any decorative elements</li>
                    <li>Specify the overall style (minimal, rustic, elegant)</li>
                  </ul>
                </div>
                <Button 
                  variant="accent" 
                  onClick={handleGenerateBackgrounds}
                  disabled={!selectedPreset || prompt.trim() === '' || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? "GENERATING..." : "GENERATE BACKGROUNDS"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Results Section (only shown when results are available) */}
        {mockResults.length > 0 && (
          <Card title="YOUR AI-GENERATED BACKGROUNDS" variant="accent" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {mockResults.map((result, index) => (
                <div key={index} className="brutalist-border">
                  <div className="relative aspect-video bg-gray-200">
                    {/* In a real app, these would be actual generated images */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      Generated Result {index + 1}
                    </div>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="font-bold">Option {index + 1}</span>
                    <Button variant="secondary" size="sm">DOWNLOAD</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm mb-4">Not quite what you wanted? Try a different prompt or background type.</p>
              <Button variant="default" onClick={() => setMockResults([])}>
                START OVER
              </Button>
            </div>
          </Card>
        )}
        
        {/* Paywall Modal */}
        {showPaywall && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white p-6 max-w-md">
              <h3 className="text-xl font-bold mb-4 text-center">UNLOCK AI BACKGROUNDS</h3>
              <p className="mb-6 text-center">
                Access our powerful AI Background Generator with a one-time payment.
              </p>
              <div className="brutalist-border p-4 mb-6 bg-gray-50">
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">$19</span>
                  <span className="text-sm ml-1">one-time payment</span>
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Unlimited background generations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>High-resolution downloads</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>3 options per generation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Commercial usage rights</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col space-y-3">
                <Button variant="accent"       onClick={() => router.push('/pricing')}>
                  UNLOCK NOW
                </Button>
                <button 
                  onClick={() => setShowPaywall(false)}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 