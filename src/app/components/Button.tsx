import React, { ElementType, ComponentPropsWithoutRef } from 'react';

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'accent' | 'default';
  size?: 'sm' | 'md' | 'lg';
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
  size = 'md',
  fullWidth = false,
  as,
  ...props
}: ButtonProps<T>) {
  const Component = as || 'button';
  
  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  const baseStyles = `brutalist-border ${sizeStyles[size]} font-mono uppercase transition-transform active:translate-y-1 active:translate-x-1`;
  
  // Define shadow styles as objects
  const shadowStyles = {
    primary: { boxShadow: '6px 6px 0 0 #000000' },
    secondary: { boxShadow: '4px 4px 0 0 #ffffff' },
    accent: { boxShadow: '6px 6px 0 0' },
    default: { boxShadow: '6px 6px 0 0 #000000' }
  };
  
  const variantStyles = {
    primary: 'bg-white text-black hover:bg-secondary',
    secondary: 'bg-black text-white hover:bg-primary',
    accent: 'bg-primary text-white font-semibold border-l-accent border-t-primary border-r-black border-b-black hover:bg-primary/80',
    default: 'bg-white text-black hover:bg-secondary'
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';
  
  return (
    <Component
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className} cursor-pointer`}
      style={shadowStyles[variant]}
      {...props}
    >
      {children}
    </Component>
  );
} 