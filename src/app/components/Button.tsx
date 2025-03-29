import React, { ElementType, ComponentPropsWithoutRef } from 'react';

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'accent';
  fullWidth?: boolean;
  as?: ElementType;
  className?: string;
};

export type ButtonProps<T extends ElementType = 'button'> = ButtonBaseProps &
  Omit<ComponentPropsWithoutRef<T>, keyof ButtonBaseProps>;

export default function Button<T extends ElementType = 'button'>({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  as,
  ...props
}: ButtonProps<T>) {
  const Component = as || 'button';
  const baseStyles = 'brutalist-border px-4 py-2 font-mono uppercase transition-transform active:translate-y-1 active:translate-x-1';
  
  // Define shadow styles as objects
  const shadowStyles = {
    primary: { boxShadow: '6px 6px 0 0 #000000' },
    secondary: { boxShadow: '4px 4px 0 0 #ffffff' },
    accent: { boxShadow: '6px 6px 0 0 rgba(255, 107, 107, 0.5), 10px 10px 0 0 rgba(79, 70, 229, 1)' }
  };
  
  const variantStyles = {
    primary: 'bg-white text-black hover:bg-secondary',
    secondary: 'bg-black text-white hover:bg-primary',
    accent: 'bg-white border-l-accent border-t-primary border-r-black border-b-black hover:bg-secondary'
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';
  
  return (
    <Component
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
      style={shadowStyles[variant]}
      {...props}
    >
      {children}
    </Component>
  );
} 