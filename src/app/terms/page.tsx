'use client';

import React from 'react';
import Link from 'next/link';
import Button from '../components/Button';

export default function TermsOfUse() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          TERMS OF USE
        </h1>
        
        <div className="brutalist-border p-6 bg-white mb-6">
          <p className="mb-4 text-sm text-right">Last Updated: March 31, 2024</p>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">1. ACCEPTANCE OF TERMS</h2>
            <p className="mb-2">
              By accessing and using PICME, you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you may not use our service.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">2. SERVICE DESCRIPTION</h2>
            <p className="mb-4">
              PICME is a browser-based image optimization tool that allows users to:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>Adjust image properties such as brightness, contrast, and white balance</li>
              <li>Resize and optimize images for web use</li>
              <li>Generate SEO-friendly filenames</li>
              <li>Process multiple images simultaneously</li>
            </ul>
            <p>
              All image processing occurs locally in your browser; no images are uploaded to or stored on our servers.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">3. USER RESPONSIBILITIES</h2>
            <p className="mb-4">
              Users of PICME are responsible for:
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>Ensuring they have the necessary rights and permissions to modify the images they process</li>
              <li>Using the service in compliance with applicable laws and regulations</li>
              <li>Not using the service to process, create, or distribute inappropriate, offensive, or illegal content</li>
              <li>Not attempting to reverse engineer, modify, or hack the service</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">4. INTELLECTUAL PROPERTY</h2>
            <p className="mb-4">
              All original content, features, and functionality of PICME are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p className="mb-2">
              You retain all rights to your original images. We claim no ownership over the images you process using our service.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">5. LIMITATIONS AND DISCLAIMERS</h2>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>PICME is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without any warranties of any kind.</li>
              <li>We do not guarantee that the service will be uninterrupted, secure, or error-free.</li>
              <li>We are not responsible for any loss of data that may occur during processing.</li>
              <li>We make no warranties regarding the accuracy or effectiveness of the SEO name generation feature.</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">6. LIMITATION OF LIABILITY</h2>
            <p className="mb-2">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">7. SERVICE MODIFICATIONS</h2>
            <p className="mb-2">
              We reserve the right to modify, suspend, or discontinue any part of PICME at any time without prior notice or liability.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">8. GOVERNING LAW</h2>
            <p className="mb-2">
              These Terms of Use shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate, without regard to its conflict of law provisions.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">9. CHANGES TO TERMS</h2>
            <p className="mb-2">
              We may update these Terms of Use from time to time. We will notify you of any changes by posting the new Terms on this page and updating the &ldquo;Last Updated&rdquo; date.
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">10. CONTACT US</h2>
            <p>
              If you have any questions about these Terms of Use, please contact us at terms@picme-app.com.
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