'use client';

import { motion, HTMLMotionProps } from 'framer-motion';

interface ScaleInProps extends HTMLMotionProps<'div'> {
  delay?: number;
  duration?: number;
}

export default function ScaleIn({
  children,
  delay = 0,
  duration = 0.3,
  ...props
}: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
