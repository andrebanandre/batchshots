'use client';

import React from 'react';

interface ProBadgeProps {
  className?: string;
}

export default function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <span className={`brutalist-border border border-black bg-yellow-400 px-1 py-0 text-[10px] font-bold uppercase leading-tight inline-block ${className}`}>
      PRO
    </span>
  );
} 