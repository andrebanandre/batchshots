import React, { useState, useRef, ReactNode } from 'react';

interface BrutalistTooltipProps {
  children: ReactNode; // The element that triggers the tooltip
  content: ReactNode; // The content of the tooltip
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right'; // Default to top
}

export default function BrutalistTooltip({
  children,
  content,
  className = '',
  position = 'top',
}: BrutalistTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Simple positioning logic (can be expanded)
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'top-1/2 right-full -translate-y-1/2 mr-2';
      case 'right':
        return 'top-1/2 left-full -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip} // Show on focus for accessibility/keyboard navigation
      onBlur={hideTooltip}  // Hide on blur
      // Consider adding touch event handlers (e.g., long press) if needed for mobile
      // tabIndex={0} // Make it focusable if the child isn't naturally focusable
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-10 p-2 text-sm bg-white border-2 border-black shadow-brutalist whitespace-nowrap ${getPositionClasses()}`}
        >
          {content}
        </div>
      )}
    </div>
  );
} 