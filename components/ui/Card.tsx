'use client';

import { HTMLAttributes, forwardRef, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'tilt';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
      if (variant !== 'tilt' || !localRef.current) return;
      const { left, top, width, height } = localRef.current.getBoundingClientRect();
      const x = (e.clientY - top - height / 2) / height;
      const y = (e.clientX - left - width / 2) / width;
      setRotate({ x: x * -8, y: y * 8 });
      setGlowPos({
        x: ((e.clientX - left) / width) * 100,
        y: ((e.clientY - top) / height) * 100,
      });
    };

    const handleMouseLeave = () => {
      setRotate({ x: 0, y: 0 });
      setIsHovered(false);
    };

    const variants = {
      default: 'bg-surface border border-border',
      elevated: 'bg-surface shadow-md border border-border',
      outlined: 'bg-transparent border-2 border-border',
      glass: [
        'bg-white/40 dark:bg-white/[0.04]',
        'backdrop-blur-xl backdrop-saturate-150',
        'border border-white/20 dark:border-white/[0.08]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
        'hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
      ].join(' '),
      tilt: 'bg-surface border border-border transition-shadow duration-300',
    };

    const Component = variant === 'tilt' ? motion.div : 'div';
    const tiltProps = variant === 'tilt' ? {
      animate: { rotateX: rotate.x, rotateY: rotate.y },
      transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
      style: { transformStyle: 'preserve-3d' as const, perspective: '1000px' as const },
      onMouseMove: handleMouseMove,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: handleMouseLeave,
    } : {};

    return (
      <Component
        ref={variant === 'tilt' ? localRef : ref as any}
        className={cn('rounded-2xl relative overflow-hidden', variants[variant] || variants.default, className)}
        {...tiltProps}
      >
        {/* Glow effect for tilt variant */}
        {variant === 'tilt' && isHovered && (
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-500"
            style={{
              background: `radial-gradient(600px circle at ${glowPos.x}% ${glowPos.y}%, rgba(0,180,216,0.08), transparent 40%)`,
            }}
          />
        )}
        
        {/* Grain texture for glass variant */}
        {variant === 'glass' && (
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

export default Card;
