import './../globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Providers } from '../providers';
import { ClerkProvider } from '@clerk/nextjs';
import { neobrutalism } from '@clerk/themes'
import CookieConsentWrapper from '../components/CookieConsentWrapper';

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
  // No need to fetch all messages, just get the translations function
  const t = await getTranslations({ locale, namespace: 'Layout' });

  return {
    metadataBase: new URL('https://batchshots.com'),
    // Use specific keys from the 'Layout' namespace
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
  };
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Resolve the locale from the params promise
  const { locale } = await params;
  
  // Enable static rendering and provide locale to next-intl
  setRequestLocale(locale);
  
  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Get messages for current locale
  const messages = await getMessages({ locale });

  // Get Clerk localization for current locale
  const clerkLocalization = clerkLocalizations[locale] || enUS;

  return (
    <ClerkProvider
      localization={clerkLocalization}
      appearance={{
        baseTheme: neobrutalism,
        signIn: { baseTheme: neobrutalism },
        signUp: { baseTheme: neobrutalism },
        userButton: { baseTheme: neobrutalism },
        userProfile: { baseTheme: neobrutalism },
      }}
    >
      <Providers 
        intlProps={{
           locale: locale, 
           messages: messages,
           timeZone: 'America/New_York'
        }}
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
            <CookieConsentWrapper />
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
