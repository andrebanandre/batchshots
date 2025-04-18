import './../globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getMessages } from 'next-intl/server';
import { Providers } from '../providers';
import { ClerkProvider } from '@clerk/nextjs';

// Import Clerk localizations
import { enUS, deDE, frFR, nlNL, plPL, ruRU, ukUA, csCZ } from '@clerk/localizations';

// Map your locale codes to Clerk localizations
const clerkLocalizations: Record<string, typeof enUS> = {
  en: enUS,
  de: deDE,
  fr: frFR,
  nl: nlNL,
  pl: plPL,
  ru: ruRU,
  uk: ukUA,
  cs: csCZ,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", 'cyrillic'],
});


export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const { locale } = await params;
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
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Get messages for current locale
  const messages = await getMessages({ locale });

  // Get Clerk localization for current locale
  const clerkLocalization = clerkLocalizations[locale] || enUS;

  return (
    // @ts-expect-error TODO: Investigate ClerkProvider type issue with async RootLayout in Next.js 15/React 19
    <ClerkProvider localization={clerkLocalization}>
      <Providers 
        intlProps={{ locale: locale, messages: messages }}
      >
        <html lang={locale}>
          <head>
            <Script src="/js/opencv-loader.js" strategy="beforeInteractive" />
          </head>
          <body
            className={`${['ru', 'uk'].includes(locale) ? montserrat.variable : `${geistSans.variable} ${geistMono.variable}`} antialiased flex flex-col min-h-screen`}
            suppressHydrationWarning
          >
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <Script
              strategy="beforeInteractive"
              src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
            />
          </body>
        </html>
      </Providers>
    </ClerkProvider>
  );
}
