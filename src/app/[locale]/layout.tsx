import "./../globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Providers } from "../providers";
import CookieConsentWrapper from "../components/CookieConsentWrapper";

// Clerk removed

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
  subsets: ["latin", "cyrillic"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // No need to fetch all messages, just get the translations function
  const t = await getTranslations({ locale, namespace: "Layout" });

  return {
    metadataBase: new URL("https://batchshots.com"),
    // Use specific keys from the 'Layout' namespace
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
  };
}

// Required for output: 'export' so that all locale segments are statically generated
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <Providers
      intlProps={{
        locale,
        messages,
        timeZone: "America/New_York",
      }}
    >
      {/* Load OpenCV early; no explicit <head> here to avoid nested html/head */}
      <Script src="/js/opencv-loader.js" strategy="beforeInteractive" />
      <div
        className={`${
          ["ru", "uk"].includes(locale)
            ? montserrat.variable
            : `${geistSans.variable} ${geistMono.variable}`
        } antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning
      >
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CookieConsentWrapper />
      </div>
    </Providers>
  );
}
