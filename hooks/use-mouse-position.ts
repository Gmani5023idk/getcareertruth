'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  elementX: number;
  elementY: number;
}

export function useMousePosition() {
  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
    elementX: 0,
    elementY: 0,
  });
  const elementRef = useRef<HTMLElement | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({
      x: e.clientX,
      y: e.clientY,
      normalizedX: e.clientX / window.innerWidth,
      normalizedY: e.clientY / window.innerHeight,
      elementX: elementRef.current
        ? e.clientX - elementRef.current.getBoundingClientRect().left
        : e.clientX,
      elementY: elementRef.current
        ? e.clientY - elementRef.current.getBoundingClientRect().top
        : e.clientY,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return { ...position, ref: elementRef };
}
