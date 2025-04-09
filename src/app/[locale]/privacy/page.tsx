'use client';

import React from 'react';
import Link from 'next/link';
import Button from '../../components/Button';

export default function PrivacyPolicy() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          PRIVACY POLICY
        </h1>
        
        <div className="brutalist-border p-6 bg-white mb-6">
          <p className="mb-4 text-sm text-right">Last Updated: March 31, 2024</p>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">1. INTRODUCTION</h2>
            <p className="mb-2">
              Welcome to PICME (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;). We are committed to protecting your privacy and ensuring the security of your personal information.
            </p>
            <p>
              This Privacy Policy explains how we handle your data when you use our browser-based image optimization tool.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">2. DATA COLLECTION</h2>
            <p className="mb-2 font-bold">We do not collect or store your images.</p>
            <p className="mb-4">
              PICME operates entirely within your browser. When you upload images to optimize:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>Your images are processed locally in your browser using client-side JavaScript.</li>
              <li>Your images never leave your device and are not transmitted to our servers.</li>
              <li>We do not store copies of your original or processed images.</li>
              <li>We do not track the content of your images.</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">3. AI-POWERED FEATURES</h2>
            <p className="mb-4">
              When you use our AI-powered SEO name generation features:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>We send only the descriptive text you provide to our API.</li>
              <li>We do not send or process your actual images through our AI systems.</li>
              <li>Your generated SEO names are delivered back to your browser and are not permanently stored on our servers.</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">4. ANALYTICS & COOKIES</h2>
            <p className="mb-2">
              We use minimal analytics to understand how our site is used:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>We collect anonymous usage statistics like page views and feature usage.</li>
              <li>We use essential cookies to provide functionality like reCAPTCHA protection.</li>
              <li>We do not use cookies for advertising or tracking across other websites.</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">5. THIRD-PARTY SERVICES</h2>
            <p className="mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>Google reCAPTCHA for spam protection on our AI features.</li>
              <li>OpenCV.js for image processing (runs entirely in your browser).</li>
            </ul>
            <p>
              Each of these services has its own privacy policy governing how they handle data.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">6. CHANGES TO THIS POLICY</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">7. CONTACT US</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@picme-app.com.
            </p>
          </section>
        </div>
        
        <div className="flex justify-center">
          <Link href="/">
            <Button variant="accent">RETURN TO HOME</Button>
          </Link>
        </div>
      </div>
    </main>
  );
} 