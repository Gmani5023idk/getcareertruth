'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
  glow?: boolean;
  intensity?: number;
  as?: 'div' | 'section';
}

export default function GlassCard({
  children,
  className,
  tilt = true,
  glow = true,
  intensity = 10,
  as = 'div',
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || !tilt) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    
    const x = (clientY - top - height / 2) / height;
    const y = (clientX - left - width / 2) / width;
    
    setRotate({ x: x * -intensity, y: y * intensity });
    setGlowPosition({
      x: ((clientX - left) / width) * 100,
      y: ((clientY - top) / height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const Component = as === 'section' ? motion.section : motion.div;

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      animate={{
        rotateX: rotate.x,
        rotateY: rotate.y,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/40 dark:bg-white/[0.04]',
        'backdrop-blur-xl backdrop-saturate-150',
        'border border-white/20 dark:border-white/[0.08]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
        'hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        'transition-shadow duration-300',
        className
      )}
    >
      {/* Glow effect */}
      {glow && isHovered && (
        <div
          className="pointer-events-none absolute -inset-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(600px circle at ${glowPosition.x}% ${glowPosition.y}%, rgba(0,180,216,0.08), transparent 40%)`,
          }}
        />
      )}
      
      {/* Subtle grain texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />
      
      {children}
    </Component>
  );
}
