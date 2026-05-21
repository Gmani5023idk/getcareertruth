'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';
type RevealVariant = 'fade' | 'slide' | 'scale' | 'zoom';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  stagger?: boolean;
  staggerDelay?: number;
  as?: 'div' | 'section' | 'article' | 'span';
}

const directionOffset = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

export default function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  variant = 'fade',
  delay = 0,
  duration = 0.5,
  distance = 30,
  once = true,
  stagger = false,
  staggerDelay = 0.08,
  as: Tag = 'div',
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  const dir = directionOffset[direction];

  const getInitial = () => {
    switch (variant) {
      case 'fade':
        return { opacity: 0, x: dir.x * distance, y: dir.y * distance };
      case 'slide':
        return { opacity: 0, x: dir.x * distance * 1.5, y: dir.y * distance * 1.5 };
      case 'scale':
        return { opacity: 0, scale: 0.92, x: dir.x * distance * 0.5, y: dir.y * distance * 0.5 };
      case 'zoom':
        return { opacity: 0, scale: 0.85 };
      default:
        return { opacity: 0, y: distance };
    }
  };

  const getAnimate = () => {
    switch (variant) {
      case 'zoom':
        return { opacity: 1, scale: 1 };
      default:
        return { opacity: 1, scale: 1, x: 0, y: 0 };
    }
  };

  const easeOut: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

  if (stagger) {
    return (
      <Tag className={className}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once, margin: '-40px' }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: staggerDelay,
                delayChildren: delay,
              },
            },
          }}
        >
          {children}
        </motion.div>
      </Tag>
    );
  }

  return (
    <Tag className={className}>
      <motion.div
        initial={getInitial()}
        whileInView={getAnimate()}
        viewport={{ once, margin: '-40px' }}
        transition={{
          duration,
          delay,
          ease: easeOut,
        }}
      >
        {children}
      </motion.div>
    </Tag>
  );
}

/**
 * ScrollReveal child — use inside a stagger ScrollReveal parent to get staggered entrance.
 */
export function RevealChild({
  children,
  className = '',
  direction = 'up',
  variant = 'fade',
  distance = 30,
}: {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  variant?: RevealVariant;
  distance?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return <>{children}</>;

  const dir = directionOffset[direction];

  const getVariants = () => {
    switch (variant) {
      case 'fade':
        return {
          hidden: { opacity: 0, x: dir.x * distance, y: dir.y * distance },
          visible: { opacity: 1, x: 0, y: 0 },
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.92, x: dir.x * distance * 0.5, y: dir.y * distance * 0.5 },
          visible: { opacity: 1, scale: 1, x: 0, y: 0 },
        };
      case 'zoom':
        return {
          hidden: { opacity: 0, scale: 0.85 },
          visible: { opacity: 1, scale: 1 },
        };
      default:
        return {
          hidden: { opacity: 0, y: distance },
          visible: { opacity: 1, y: 0 },
        };
    }
  };

  return (
    <motion.div
      className={className}
      variants={getVariants()}
    >
      {children}
    </motion.div>
  );
}
