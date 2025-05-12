import React, { useState } from 'react';
import BrutalistTooltip from './BrutalistTooltip';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'accent';
  headerRight?: React.ReactNode;
  initiallyCollapsed?: boolean;
  collapsible?: boolean;
}

export default function Card({ 
  children, 
  title, 
  className = '',
  variant = 'default',
  headerRight,
  initiallyCollapsed = false,
  collapsible = true
}: CardProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsible && initiallyCollapsed);
  const baseClass = variant === 'accent' ? 'brutalist-accent-card' : 'brutalist-card';
  
  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const ClickableHeaderElement = collapsible ? 'button' : 'div';

  return (
    <div className={`${baseClass} ${className}`}>
      {(title || headerRight) && (
        <div className={`w-full mb-4 border-b-2 border-black pb-2 flex justify-between items-center`}>
          <ClickableHeaderElement
            type={collapsible ? "button" : undefined}
            onClick={collapsible ? toggleCollapse : undefined}
            className={`flex items-center min-w-0 mr-2 
                        ${collapsible ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2' : 'cursor-default'}`}
            aria-expanded={collapsible ? !isCollapsed : undefined}
            aria-controls={collapsible ? `card-content-${title?.replace(/\s+/g, '-')}` : undefined}
            {...(collapsible ? {} : { role: 'heading', 'aria-level': 2 })}
          >
            {collapsible && (
              <span className="mr-2 text-xl font-bold flex-shrink-0" aria-hidden="true">
                {isCollapsed ? '+' : '−'}
              </span>
            )}
            {title && (
              <BrutalistTooltip 
                content={title} 
                position="top" 
                className="inline-block min-w-0"
              >
                <h2 
                  className="text-xl font-bold uppercase truncate" 
                  id={!collapsible ? `card-title-${title?.replace(/\s+/g, '-')}` : undefined}
                >
                  {title}
                </h2>
              </BrutalistTooltip>
            )}
          </ClickableHeaderElement>
          {headerRight && (
            <div className="flex items-center flex-shrink-0 ml-auto pl-2"> 
              {headerRight}
            </div>
          )}
        </div>
      )}
      <div 
        id={`card-content-${title?.replace(/\s+/g, '-')}`}
        className={`${collapsible && isCollapsed ? 'hidden' : 'block'}`}
        {...(!collapsible && title ? { role: 'region', 'aria-labelledby': `card-title-${title?.replace(/\s+/g, '-')}` } : {})}
      >
        {children}
      </div>
    </div>
  );
} 