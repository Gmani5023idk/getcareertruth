'use client';

import { useState, useCallback, useRef } from 'react';
import { springTransition } from './use-scroll-animation';

interface TiltOptions {
  intensity?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
}

export function use3DTilt(options: TiltOptions = {}) {
  const {
    intensity = 10,
    perspective = 1000,
    scale = 1.02,
    speed = 0.5,
    glare = true,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [glareStyle, setGlareStyle] = useState({});

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (y - 0.5) * intensity;
      const tiltY = (x - 0.5) * -intensity;

      setTransform(
        `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      if (glare) {
        setGlareStyle({
          background: `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.08), transparent 60%)`,
        });
      }
    },
    [intensity, perspective, scale, glare]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform(
      `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
    );
    setGlareStyle({});
  }, [perspective]);

  const tiltProps = {
    ref,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    style: {
      transform,
      transition: `transform ${speed}s cubic-bezier(0.25, 0.1, 0.25, 1)`,
      transformStyle: 'preserve-3d' as const,
    },
  };

  return { ...tiltProps, glareStyle };
}
