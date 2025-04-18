'use client';

export const runtime = 'edge';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Button from '../../components/Button';

export default function TermsOfUse() {
  const t = useTranslations('TermsOfUse');

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="brutalist-accent-card mb-8">
        <h1 className="text-3xl font-bold text-center uppercase mb-6">
          {t('title')}
        </h1>
        
        <div className="brutalist-border p-6 bg-white mb-6">
          <p className="mb-4 text-sm text-right">{t('lastUpdated')}</p>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section1Title')}</h2>
            <p className="mb-2">
              {t('section1P1')}
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section2Title')}</h2>
            <p className="mb-4">
              {t('section2P1')}
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>{t('section2Li1')}</li>
              <li>{t('section2Li2')}</li>
              <li>{t('section2Li3')}</li>
              <li>{t('section2Li4')}</li>
            </ul>
            <p>
              {t('section2P2')}
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section3Title')}</h2>
            <p className="mb-4">
              {t('section3P1')}
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>{t('section3Li1')}</li>
              <li>{t('section3Li2')}</li>
              <li>{t('section3Li3')}</li>
              <li>{t('section3Li4')}</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section4Title')}</h2>
            <p className="mb-4">
              {t('section4P1')}
            </p>
            <p className="mb-2">
              {t('section4P2')}
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section5Title')}</h2>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>{t('section5Li1')}</li>
              <li>{t('section5Li2')}</li>
              <li>{t('section5Li3')}</li>
              <li>{t('section5Li4')}</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section6Title')}</h2>
            <p className="mb-2">
              {t('section6P1')}
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section7Title')}</h2>
            <p className="mb-2">
              {t('section7P1')}
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section8Title')}</h2>
            <p className="mb-2">
              {t('section8P1')}
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section9Title')}</h2>
            <p className="mb-2">
              {t('section9P1')}
            </p>
          </section>
          
          <section className="mb-6">
            <h2 className="text-xl font-bold mb-3 uppercase">{t('section10Title')}</h2>
            <p>
              {t('section10P1')}
            </p>
          </section>
        </div>
        
        <div className="flex justify-center">
          <Link href="/">
            <Button variant="accent">{t('returnButton')}</Button>
          </Link>
        </div>
      </div>
    </main>
  );
} 