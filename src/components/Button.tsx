import React from 'react';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'cancel' | 'back' | 'login';
  size?: 'default' | 'icon' | 'large' | 'medium' | 'small';
  fullWidth?: boolean;
  onClick?: () => void;
  className?: string;
  icon?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'default',
  fullWidth = false,
  icon,
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = 'font-medium transition-colors duration-200';
  
  const variants = {
    primary: 'bg-yellow-400 hover:bg-yellow-500 text-gray-900',
    secondary: 'bg-brown-600 hover:bg-brown-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-100',
    cancel: 'bg-transparent hover:bg-gray-100',
    back: 'bg-transparent text-white',
    login: 'bg-yellow-400 hover:bg-yellow-500 text-white'
  };

  const sizes = {
    default: 'px-3 py-2 rounded-lg',
    icon: 'p-2 rounded-full',
    large: 'px-5 py-3 rounded-lg',
    medium: 'px-2 py-2 rounded-lg',
    small: 'px-2 py-1 rounded-md'
  };
  
  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      onClick={props.onClick}
      type={props.type}
      disabled={props.disabled}
    >
      {icon && (
        <img 
          src={icon} 
          alt={typeof children === 'string' ? children : 'button icon'} 
          className={`h-4 w-4 ${size === 'large' ? 'h-6 w-6' : ''} ${size === 'medium' ? 'h-5 w-5' : ''} ${size === 'small' ? 'h-3 w-3' : ''} mr-2 inline`}
        />
      )}
      {children}
    </button>
  );
}