"use client";

import React, { useState, useRef, useEffect } from 'react';

type Option = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

type BrutalistSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export default function BrutalistSelect({
  options,
  value,
  onChange,
  className = '',
  disabled = false,
}: BrutalistSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(option => option.value === value);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <button
        type="button"
        className={`brutalist-border bg-white px-3 py-1.5 flex items-center justify-between gap-2 w-full text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{ boxShadow: '3px 3px 0 0 #000000' }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span>{selectedOption?.label || 'Select option'}</span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute top-full left-0 w-full mt-1 brutalist-border bg-white z-10"
          style={{ boxShadow: '3px 3px 0 0 #000000' }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`px-3 py-1.5 flex items-center gap-2 w-full text-left text-sm hover:bg-secondary ${
                option.value === value ? 'bg-primary text-white' : ''
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 