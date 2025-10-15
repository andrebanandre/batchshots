"use client";

import React from "react";
import Loader from "./Loader";
import HowItWorksSidebar, { HowItWorksStep } from "./HowItWorksSidebar";

interface ToolPageWrapperProps {
  title: string;
  isLoading?: boolean;
  loadingStatus?: string;
  loaderTitle?: string;
  loaderDescription?: string;
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  howItWorksSteps?: HowItWorksStep[];
  howItWorksTitle: string;
}

export default function ToolPageWrapper({
  title,
  isLoading = false,
  loadingStatus,
  loaderTitle,
  loaderDescription,
  children,
  sidebarContent,
  howItWorksSteps,
  howItWorksTitle,
}: ToolPageWrapperProps) {
  return (
    <>
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="brutalist-accent-card mb-8">
          <h1 className="text-3xl font-bold text-center uppercase mb-6">
            {title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 relative">
              {isLoading ? (
                <div className="brutalist-border p-4 text-center bg-white min-h-[400px] flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader size="lg" />
                    <h3 className="text-lg font-bold mb-2">{loaderTitle}</h3>
                    <p className="text-sm text-gray-600">
                      {loadingStatus || loaderDescription}
                    </p>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
            <div className="space-y-6">
              {howItWorksSteps && (
                <HowItWorksSidebar
                  title={howItWorksTitle}
                  steps={howItWorksSteps}
                />
              )}
              {sidebarContent}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
