import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'accent';
}

export default function Card({ 
  children, 
  title, 
  className = '',
  variant = 'default'
}: CardProps) {
  const baseClass = variant === 'accent' ? 'brutalist-accent-card' : 'brutalist-card';
  
  return (
    <div className={`${baseClass} ${className}`}>
      {title && (
        <div className="mb-4 border-b-2 border-black pb-2">
          <h2 className="text-xl font-bold uppercase">{title}</h2>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
} 