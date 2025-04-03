'use client';

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
}

const Loader: React.FC<LoaderProps> = ({ size = 'md' }) => {
  // Size configurations
  const dimensions = {
    sm: { width: 60, height: 20, rectSize: 12 },
    md: { width: 120, height: 40, rectSize: 24 },
    lg: { width: 180, height: 60, rectSize: 36 },
  };
  
  const { width, height, rectSize } = dimensions[size];
  
  // Scale the container based on size
  const containerStyle: React.CSSProperties = {
    width: width,
    height: height,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  // Common styles for rectangles
  const rectStyle: React.CSSProperties = {
    width: rectSize,
    height: rectSize,
    position: 'absolute',
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  };
  
  return (
    <div style={containerStyle}>
      <div 
        style={{
          ...rectStyle,
          backgroundColor: '#FF6B6B',
          animationName: 'shuffleRect1',
        }}
      />
      <div 
        style={{
          ...rectStyle,
          backgroundColor: '#4F46E5',
          animationName: 'shuffleRect2',
        }}
      />
      
      <style jsx>{`
        @keyframes shuffleRect1 {
          0%, 100% {
            transform: translate(5px, 8px);
          }
          50% {
            transform: translate(10px, 3px);
          }
        }
        
        @keyframes shuffleRect2 {
          0%, 100% {
            transform: translate(10px, 3px);
          }
          50% {
            transform: translate(5px, 8px);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;