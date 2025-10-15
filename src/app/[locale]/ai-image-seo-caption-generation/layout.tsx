import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import React from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "ImageSeoGenerationPage.metadata",
  });
  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    metadataBase: new URL("https://batchshots.com"),
    alternates: {
      canonical: `/ai-image-seo-caption-generation`,
    },
  };
}

export default async function CaptionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <>{children}</>;
}
