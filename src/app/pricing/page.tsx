'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import PricingCard from '../components/PricingCard';
import { useIsPro } from '../hooks/useIsPro';

export default function PricingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isProUser, isLoading: isLoadingProStatus } = useIsPro();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  const canceledParam = searchParams.get('canceled');
  
  const handleFreePlan = () => {
    // Free plan is always available
    router.push('/');
  };

  const handleProPlan = async () => {
    if (!isSignedIn) {
      // Redirect to sign in
      router.push('/sign-in');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const session = await response.json();
      
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageAccount = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/customer-portal');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      alert('Failed to access customer portal. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const freeFeatures = [
    'Basic image optimization',
    '5 images per day',
    'Standard quality',
    'Limited background options',
  ];

  const proFeatures = [
    'Advanced image optimization',
    'Unlimited images',
    'Premium quality',
    'All background options',
    'Priority processing',
    'Early access to new features',
  ];

  if (!isLoaded || isLoadingProStatus || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
        <div className="brutalist-border border-3 border-black p-6 text-center">
          <p className="text-xl font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {successParam && (
        <div className="mb-8 brutalist-border border-3 border-black bg-green-100 p-4">
          <h2 className="text-xl font-bold">Thank you for your purchase!</h2>
          <p>You are now a Pro user. Enjoy all the premium features!</p>
        </div>
      )}
      
      {canceledParam && (
        <div className="mb-8 brutalist-border border-3 border-black bg-yellow-100 p-4">
          <h2 className="text-xl font-bold">Payment canceled</h2>
          <p>Your payment was canceled. Feel free to try again when you&apos;re ready.</p>
        </div>
      )}
      
      <h1 className="text-4xl font-bold text-center mb-4">Choose Your Plan</h1>
      <p className="text-center text-lg mb-12">Get access to powerful image tools with our simple pricing</p>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <PricingCard
          title="Free"
          price="FREE"
          features={freeFeatures}
          isPro={false}
          isCurrentPlan={!isProUser}
          onSelectPlan={handleFreePlan}
          buttonText="START FREE"
        />
        
        <PricingCard
          title="Pro"
          price="$19.99"
          features={proFeatures}
          isPro={true}
          isCurrentPlan={isProUser}
          onSelectPlan={handleProPlan}
          buttonText="UPGRADE TO PRO"
        />
      </div>
      
      {isProUser && (
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Manage Your Pro Account</h2>
          <button 
            onClick={handleManageAccount}
            className="inline-block brutalist-border border-3 border-black bg-white px-6 py-3 font-bold hover:bg-gray-100 transition-colors"
          >
            VIEW BILLING PORTAL
          </button>
        </div>
      )}
    </div>
  );
} 