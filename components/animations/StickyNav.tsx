'use client';

import { useReducedMotion, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useScrollPosition } from '@/hooks/use-scroll-position';

interface StickyNavProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export default function StickyNav({ children, className, threshold = 50 }: StickyNavProps) {
  const scrolled = useScrollPosition(threshold);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.nav
      initial={shouldReduceMotion ? undefined : { y: -100 }}
      animate={shouldReduceMotion ? undefined : { y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={cn(
        'sticky top-0 z-50 will-change-transform',
        scrolled
          ? 'bg-surface/90 backdrop-blur-xl border-b border-border shadow-lg'
          : 'bg-surface/30 backdrop-blur-sm border-b border-transparent',
        shouldReduceMotion ? 'transition-none' : 'transition-all duration-300 ease-out',
        className
      )}
    >
      {children}
    </motion.nav>
  );
}
