'use client';

import { ButtonHTMLAttributes, forwardRef, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  magnetic?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, magnetic = true, children, ...props }, ref) => {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden';

    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-teal',
      secondary: 'bg-white/80 dark:bg-surface border border-primary text-primary hover:bg-primary-bg',
      ghost: 'bg-transparent text-text-primary hover:bg-surface-2',
      danger: 'bg-error text-white hover:bg-error/90',
    };

    const sizes = {
      sm: 'h-10 px-4 text-sm',
      md: 'h-12 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!buttonRef.current || disabled) return;
      const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
      const x = (e.clientX - left - width / 2) * 0.3;
      const y = (e.clientY - top - height / 2) * 0.3;
      setMousePosition({ x, y });
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 });
      setIsHovered(false);
    };

    return (
      <div
        ref={buttonRef}
        onMouseMove={magnetic ? handleMouseMove : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={magnetic ? handleMouseLeave : undefined}
        className="inline-block"
      >
        <motion.button
          ref={ref}
          animate={magnetic ? { x: mousePosition.x, y: mousePosition.y } : {}}
          transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
          className={cn(baseStyles, variants[variant], sizes[size], className, 'group')}
          disabled={disabled || isLoading}
          {...(props as any)}
        >
          {/* Shimmer hover effect */}
          {isHovered && !disabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 2.5 }}
              className="absolute inset-0 bg-white/10 rounded-full"
              style={{ x: mousePosition.x, y: mousePosition.y, translateX: '-50%', translateY: '-50%' }}
            />
          )}

          {isLoading ? (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              <span>Loading...</span>
            </div>
          ) : (
            <span className="relative z-10 flex items-center gap-2">
              {children}
            </span>
          )}
        </motion.button>
      </div>
    );
  }
);

Button.displayName = 'Button';

export default Button;