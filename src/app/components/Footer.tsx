import React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import LanguageSelector from "./LanguageSelector";

export default function Footer() {
  const t = useTranslations("Footer");
  const tNavbar = useTranslations("Navbar");
  const tHome = useTranslations("Home");

  return (
    <footer className="bg-white border-t-3 border-black py-6 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* First Column - Logo and About */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-bold uppercase mb-2">Batch Shots</h3>
            <p className="text-sm max-w-sm">{t("about")}</p>
            <div className="flex space-x-4 mt-2">
              <a
                href="https://x.com/andre_banandre"
                className="brutalist-border p-2"
                aria-label="Twitter"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              {/* <a
                href="https://facebook.com"
                className="brutalist-border p-2"
                aria-label="Facebook"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a> */}
              {/* <a
                href="https://instagram.com"
                className="brutalist-border p-2"
                aria-label="Instagram"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a> */}
              <a
                href="https://www.linkedin.com/in/andrii-fedorenko-65905863/"
                className="brutalist-border p-2"
                aria-label="LinkedIn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
            </div>
          </div>

          {/* Second Column - Quick Links */}
          <div>
            <h3 className="text-lg font-bold uppercase mb-4">
              {t("quickLinks")}
            </h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/" className="hover:text-primary text-sm">
                {tNavbar("imageOptimizer")}
              </Link>
              {/* Pricing removed */}
              <Link href="/privacy" className="hover:text-primary text-sm">
                {tHome("privacyPolicy")}
              </Link>
              <Link href="/terms" className="hover:text-primary text-sm">
                {tHome("termsOfUse")}
              </Link>
            </nav>
          </div>

          {/* Third Column - Tools */}
          <div>
            <h3 className="text-lg font-bold uppercase mb-4">
              {tNavbar("tools")}
            </h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/ai-photo-duplicate-finder"
                className="hover:text-primary text-sm"
              >
                {tNavbar("aiPhotoDuplicateFinder")}
              </Link>
              <Link
                href="/background-removal"
                className="hover:text-primary text-sm"
              >
                {tNavbar("removeBackgrounds")}
              </Link>
              <Link
                href="/ai-image-seo-caption-generation"
                className="hover:text-primary text-sm"
              >
                {tNavbar("aiImageSeoCaptionGeneration")}
              </Link>
              <Link
                href="/add-watermark"
                className="hover:text-primary text-sm"
              >
                {tNavbar("addWatermark")}
              </Link>
              <Link
                href="/image-format-convertor"
                className="hover:text-primary text-sm"
              >
                {tNavbar("imageFormatConvertor")}
              </Link>
            </nav>
          </div>

          {/* Fourth Column - Contact & Language */}
          <div className="text-right flex flex-col items-end space-y-2">
            <div>
              <div className="font-bold uppercase text-sm mb-1">
                {t("contactUs")}
              </div>
              <a
                href="mailto:andre@banandre.com"
                className="text-sm hover:underline"
              >
                andre@banandre.com
              </a>
            </div>
            <LanguageSelector />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-center">
          <p className="mt-2 text-xs">
            <a
              href="https://www.banandre.com/"
              className="hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              🍌 banandre 🍌
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
