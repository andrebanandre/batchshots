import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'accent';
  headerRight?: React.ReactNode;
}

export default function Card({ 
  children, 
  title, 
  className = '',
  variant = 'default',
  headerRight
}: CardProps) {
  const baseClass = variant === 'accent' ? 'brutalist-accent-card' : 'brutalist-card';
  
  return (
    <div className={`${baseClass} ${className}`}>
      {title && (
        <div className="mb-4 border-b-2 border-black pb-2 flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase">{title}</h2>
          {headerRight && (
            <div className="flex items-center">
              {headerRight}
            </div>
          )}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
} 