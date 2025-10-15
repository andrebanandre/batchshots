"use client";

import React from "react";
import Card from "./Card";

export interface HowItWorksStep {
  title: string;
  description: string;
  proNote?: string;
}

interface HowItWorksSidebarProps {
  title: string;
  steps: HowItWorksStep[];
}

export default function HowItWorksSidebar({
  title,
  steps,
}: HowItWorksSidebarProps) {
  return (
    <Card title={title} variant="accent">
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="brutalist-border p-3 bg-white">
            <h3 className="font-bold mb-2">{step.title}</h3>
            <p className="text-sm">
              {step.description}
              {step.proNote && ` ${step.proNote}`}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
