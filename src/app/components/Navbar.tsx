"use client";

import React, { useState, useRef, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import LanguageSelector from "./LanguageSelector";
import MobileMenu from "./MobileMenu";

// Simple SVG logo component
const Logo = () => (
  <svg
    width="190"
    height="40"
    viewBox="0 0 190 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="5" y="8" width="24" height="24" fill="#FF6B6B" />
    <rect x="10" y="3" width="24" height="24" fill="#4F46E5" />
    <text
      x="40"
      y="26"
      fontFamily="sans-serif"
      fontWeight="700"
      fontSize="20"
      fill="black"
    >
      BATCH SHOTS
    </text>
  </svg>
);

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("Navbar");

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <header className="border-b-3 border-black sticky top-0 bg-white z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center"
            aria-label="Go to homepage"
          >
            <Logo />
          </Link>
          <div className="hidden md:block">
            <LanguageSelector />
          </div>
        </div>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="font-bold text-lg uppercase hover:text-primary transition-colors"
          >
            {t("imageOptimizer")}
          </Link>
          {/* Tools Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="font-bold text-lg uppercase hover:text-primary transition-colors flex items-center gap-1"
              onClick={toggleDropdown}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {t("tools")}
              <svg
                className={`w-4 h-4 ml-1 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white brutalist-border border-3 border-black shadow-lg z-50">
                <Link
                  href="/ai-photo-duplicate-finder"
                  className="block px-4 py-2 text-sm hover:bg-slate-100 brutalist-border-b border-black"
                >
                  {t("aiPhotoDuplicateFinder")}
                </Link>
                <Link
                  href="/background-removal"
                  className="block px-4 py-2 text-sm hover:bg-slate-100 brutalist-border-b border-black"
                >
                  {t("removeBackgrounds")}
                </Link>
                {/* Removed Gemini feature link */}
                <Link
                  href="/ai-image-seo-caption-generation"
                  className="block px-4 py-2 text-sm hover:bg-slate-100 brutalist-border-b border-black"
                >
                  {t("aiImageSeoCaptionGeneration")}
                </Link>
                <Link
                  href="/add-watermark"
                  className="block px-4 py-2 text-sm hover:bg-slate-100 brutalist-border-b border-black"
                >
                  {t("addWatermark")}
                </Link>
                <Link
                  href="/image-format-convertor"
                  className="block px-4 py-2 text-sm hover:bg-slate-100 brutalist-border-b border-black"
                >
                  {t("imageFormatConvertor")}
                </Link>
              </div>
            )}
          </div>
          {/* <Link href="/backgrounds" className="font-bold text-lg uppercase hover:text-primary transition-colors">
            {t('aiBackgrounds')}
          </Link> */}
          {/* Pricing removed */}
          {/* Auth removed */}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden brutalist-border border-3 p-2"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <div className="w-6 h-0.5 bg-black mb-1.5"></div>
          <div className="w-6 h-0.5 bg-black mb-1.5"></div>
          <div className="w-6 h-0.5 bg-black"></div>
        </button>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>
    </header>
  );
}
