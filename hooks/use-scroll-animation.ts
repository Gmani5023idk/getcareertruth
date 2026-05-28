'use client';

import { useRef, useMemo } from 'react';
import { useInView, type Variants, type UseInViewOptions } from 'framer-motion';

type AnimationType = 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideUp' | 'slideDown';

const animationVariants: Record<AnimationType, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInDown: {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInLeft: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  fadeInRight: {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  slideUp: {
    hidden: { y: 60, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
  slideDown: {
    hidden: { y: -60, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
};

interface UseScrollAnimationOptions {
  animation?: AnimationType;
  once?: boolean;
  margin?: string;
  delay?: number;
  duration?: number;
}

export function useScrollAnimation({
  animation = 'fadeInUp',
  once = true,
  margin = '-50px',
  delay = 0,
  duration = 0.5,
}: UseScrollAnimationOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: margin as UseInViewOptions['margin'] });

  const variants = useMemo(() => animationVariants[animation], [animation]);

  const animationProps = {
    ref,
    variants,
    initial: 'hidden',
    animate: isInView ? 'visible' : 'hidden',
    transition: {
      duration,
      delay,
      ease: [0.25, 0.1, 0.25, 1],
    },
  };

  return { ref, isInView, animationProps };
}

// Stagger children variants
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const springTransition = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
};

export const smoothTransition = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1],
};
