'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsPro } from '../../hooks/useIsPro';
import Button from '../../components/Button';
import PricingCard from '../../components/PricingCard';
import ProBadge from '../../components/ProBadge';

export default function PricingPage() {
  const router = useRouter();
  const { isProUser, isLoading } = useIsPro();
  const [showCheckout, setShowCheckout] = useState(false);
  
  const handleUpgrade = () => {
    // In a real application, this would show a checkout form or redirect to payment provider
    setShowCheckout(true);
  };
  
  const handleMockPurchase = () => {
    // In a real app, this would be handled by a payment provider
    alert('Thank you for your purchase! In a real application, you would now be redirected to complete payment.');
    
    // Redirect to home page
    router.push('/');
  };
  
  const handleBackToEditor = () => {
    router.push('/');
  };
  
  // Pricing features
  const freeFeatures = [
    "Process up to 10 images at once",
    "Basic image adjustments",
    "Single image background removal",
    "Standard export options",
    "Browser-based processing"
  ];
  
  const proFeatures = [
    "Process up to 100 images at once", 
    "Advanced image adjustments and presets",
    "Bulk background removal (up to 100 images)",
    "SEO filename generation",
    "Priority support",
    "One-time payment, lifetime access"
  ];
  
  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          PRICING PLANS
        </h1>
        
        <div className="mb-6">
          <p className="text-center text-lg max-w-2xl mx-auto">
            Choose the perfect plan for your image optimization needs. 
            Our PRO plan offers a lifetime license with a one-time payment.
          </p>
        </div>
        
        {isLoading ? (
          <div className="text-center p-8">Loading...</div>
        ) : isProUser ? (
          <div className="max-w-lg mx-auto text-center p-8 brutalist-border bg-white">
            <div className="flex items-center justify-center mb-4">
              <ProBadge className="mr-2" /> 
              <h2 className="text-2xl font-bold">You're already a PRO user!</h2>
            </div>
            <p className="mb-6">
              Thank you for your support. You have access to all PRO features including bulk background removal,
              advanced image adjustments, and SEO filename generation.
            </p>
            <Button variant="primary" onClick={handleBackToEditor}>
              BACK TO EDITOR
            </Button>
          </div>
        ) : showCheckout ? (
          <div className="max-w-lg mx-auto brutalist-border p-6 bg-white">
            <h2 className="text-2xl font-bold mb-6 text-center">COMPLETE YOUR PURCHASE</h2>
            
            <div className="mb-6 brutalist-border p-4 bg-yellow-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">PRO LIFETIME LICENSE</span>
                <span className="text-2xl font-bold">$19.99</span>
              </div>
              <p className="text-sm text-gray-600">
                One-time payment, lifetime access to all PRO features
              </p>
            </div>
            
            {/* This would be replaced with a real payment form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-bold mb-2">EMAIL</label>
                <input 
                  type="email" 
                  className="w-full p-2 brutalist-border" 
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block font-bold mb-2">CARD INFORMATION</label>
                <input 
                  type="text" 
                  className="w-full p-2 brutalist-border mb-2" 
                  placeholder="1234 5678 9012 3456"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    className="p-2 brutalist-border" 
                    placeholder="MM/YY"
                  />
                  <input 
                    type="text" 
                    className="p-2 brutalist-border" 
                    placeholder="CVC"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button variant="primary" onClick={handleMockPurchase}>
                COMPLETE PURCHASE
              </Button>
              
              <button 
                onClick={() => setShowCheckout(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Go back
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <PricingCard
              title="FREE"
              price="FREE"
              features={freeFeatures}
              isPro={false}
              isCurrentPlan={!isProUser}
              onSelectPlan={handleBackToEditor}
              buttonText="CONTINUE WITH FREE"
            />
            
            <PricingCard
              title="PRO"
              price="$19.99"
              features={proFeatures}
              isPro={true}
              isCurrentPlan={isProUser}
              onSelectPlan={handleUpgrade}
              buttonText="UPGRADE TO PRO"
            />
          </div>
        )}
        
        <div className="mt-12 bg-white brutalist-border p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">FREQUENTLY ASKED QUESTIONS</h2>
          
          <div className="space-y-4">
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">Is this really a one-time payment?</h3>
              <p className="text-sm">
                Yes! Pay once and get lifetime access to all PRO features. No recurring subscriptions.
              </p>
            </div>
            
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">How does background removal work?</h3>
              <p className="text-sm">
                We use advanced AI algorithms to detect and remove backgrounds from your product images.
                The entire process happens in your browser - we never store your images on our servers.
              </p>
            </div>
            
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">What are the image limits?</h3>
              <p className="text-sm">
                Free users can process up to 10 images at once with basic features and remove the background
                from 1 image at a time. PRO users can process up to 100 images simultaneously, including bulk
                background removal.
              </p>
            </div>
            
            <div className="brutalist-border p-4 bg-white">
              <h3 className="font-bold mb-2">Can I request a refund?</h3>
              <p className="text-sm">
                Yes, we offer a 30-day money-back guarantee if you're not satisfied with the PRO features.
                Contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 