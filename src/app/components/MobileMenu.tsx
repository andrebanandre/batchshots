import React from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PRIMARY_NAV, TOOL_NAV } from "../lib/navigation";
// Auth removed

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}
export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const t = useTranslations("Navbar");

  if (!isOpen) return null;

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="brutalist-border border-3 border-l-accent border-t-primary border-r-black border-b-black bg-white p-4 w-full min-h-screen shadow-brutalist">
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="text-2xl font-bold">
            &times;
          </button>
        </div>
        <nav className="flex flex-col space-y-4">
          {[...PRIMARY_NAV, ...TOOL_NAV].map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={handleLinkClick}
              className="font-bold text-lg py-2 px-4 brutalist-border hover:bg-slate-100"
            >
              {t(entry.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
