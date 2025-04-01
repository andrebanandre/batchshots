'use client';

import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';

const features = [
  {
    name: 'Image Optimizer',
    free: true,
    pro: true,
    description: 'Resize, crop, and optimize images for web and social media'
  },
  {
    name: 'Batch Processing',
    free: true,
    pro: true,
    description: 'Process multiple images at once (up to 10)'
  },
  {
    name: 'Custom Presets',
    free: true,
    pro: true,
    description: 'Create and save custom image presets'
  },
  {
    name: 'Advanced Adjustments',
    free: true,
    pro: true,
    description: 'Fine-tune brightness, contrast, saturation, and more'
  },
  {
    name: 'High-Resolution Export',
    free: true,
    pro: true,
    description: 'Export images in various formats and sizes'
  },
  {
    name: 'AI Background Generator',
    free: false,
    pro: true,
    description: 'Generate professional backgrounds for your product photos'
  },
  {
    name: 'Multiple AI Options',
    free: false,
    pro: true,
    description: 'Get 3 different AI-generated backgrounds per upload'
  },
  {
    name: 'Commercial Usage Rights',
    free: false,
    pro: true,
    description: 'Use generated images for commercial purposes'
  },
  {
    name: 'Priority Support',
    free: false,
    pro: true,
    description: 'Get faster responses from our team'
  }
];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          PRICING PLANS
        </h1>
        
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <p className="text-lg">
            Choose the plan that fits your needs. All plans include our core image optimization tools.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Free Plan */}
          <div className="brutalist-border border-3 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">FREE</h2>
              <p className="text-sm mb-4">Perfect for basic image optimization needs</p>
              <div className="flex items-end mb-4">
                <span className="text-4xl font-bold">$0</span>
              </div>
              <Button variant="default" size="lg" className="w-full" href="/">
                GET STARTED
              </Button>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase">Included Features:</h3>
              <ul className="space-y-3">
                {features.filter(f => f.free).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 font-bold">✓</span>
                    <div>
                      <p className="font-bold text-sm">{feature.name}</p>
                      <p className="text-xs">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Pro Plan */}
          <div className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black p-6 shadow-brutalist-accent relative">
            <div className="absolute -top-4 -right-4 brutalist-border bg-accent text-white px-3 py-1 font-bold">
              MOST POPULAR
            </div>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">PRO</h2>
              <p className="text-sm mb-4">Unlock AI-powered features and more</p>
              <div className="flex items-end mb-4">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-sm ml-2 mb-1">one-time payment</span>
              </div>
              <Button variant="accent" size="lg" className="w-full" href="/backgrounds">
                GET PRO
              </Button>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase">Everything in FREE, plus:</h3>
              <ul className="space-y-3">
                {features.filter(f => f.pro && !f.free).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-accent mr-2 font-bold">✓</span>
                    <div>
                      <p className="font-bold text-sm">{feature.name}</p>
                      <p className="text-xs">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <Card title="FREQUENTLY ASKED QUESTIONS" variant="accent" className="mb-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="brutalist-border p-4">
              <h3 className="font-bold mb-2">Is this really a one-time payment?</h3>
              <p className="text-sm">Yes! Pay once and get lifetime access to all Pro features. No recurring fees or hidden charges.</p>
            </div>
            
            <div className="brutalist-border p-4">
              <h3 className="font-bold mb-2">Can I use the images commercially?</h3>
              <p className="text-sm">Yes, all optimized and AI-generated images come with full commercial usage rights.</p>
            </div>
            
            <div className="brutalist-border p-4">
              <h3 className="font-bold mb-2">How many images can I process?</h3>
              <p className="text-sm">Both Free and Pro plans allow up to 10 images per batch. There's no monthly limit.</p>
            </div>
            
            <div className="brutalist-border p-4">
              <h3 className="font-bold mb-2">Do you store my images?</h3>
              <p className="text-sm">No. All image processing happens directly in your browser. We don't store your images on our servers.</p>
            </div>
            
            <div className="brutalist-border p-4">
              <h3 className="font-bold mb-2">Can I request a refund?</h3>
              <p className="text-sm">We offer a 7-day money-back guarantee if you're not satisfied with the Pro features.</p>
            </div>
            
            <div className="brutalist-border p-4">
              <h3 className="font-bold mb-2">Do you offer customer support?</h3>
              <p className="text-sm">Yes, all users receive support. Pro users enjoy priority support with faster response times.</p>
            </div>
          </div>
        </Card>
        
        {/* Call to Action */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold mb-4">Ready to transform your product photos?</h2>
          <p className="mb-6">Join thousands of businesses already using PICME to improve their online presence.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button variant="default" href="/">
              TRY FOR FREE
            </Button>
            <Button variant="accent" href="/backgrounds">
              GET PRO NOW
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 