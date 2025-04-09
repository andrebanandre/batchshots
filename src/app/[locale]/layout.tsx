import './../globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getMessages } from 'next-intl/server';

import {
  ClerkProvider,
} from '@clerk/nextjs'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const locale = await Promise.resolve(params.locale);
  const messages = await getMessages({ locale });
  const tLayout = messages?.Layout as Record<string, string> || {};

  return {
    title: tLayout.title || "PicMe - SEO-Friendly Image Optimizer",
    description: tLayout.description || "Optimize your product images for SEO with simple adjustments to white balance, contrast, and size.",
    keywords: tLayout.keywords || "image optimization, SEO images, product photos, white balance, image batch processing",
  };
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const locale = await Promise.resolve(params.locale);
  
  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Get messages for current locale
  const messages = await getMessages({ locale });

  return (
    <ClerkProvider>
      <html lang={locale}>
        <head>
          <Script src="/js/opencv-loader.js" strategy="beforeInteractive" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
          suppressHydrationWarning
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <Script
              strategy="beforeInteractive"
              src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
            />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
