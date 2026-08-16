"use client";

import { useEffect, useRef, useState } from "react";
import JourneyArc from "./JourneyArc";

// The card inside JourneyArc is hardcoded to these dimensions
const CARD_W = 660;
const CARD_H = 520;

export default function JourneyArcWrapper() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [mounted, setMounted] = useState(false);

  // Flag once hydrated — prevents SSR/CSR style mismatch
    useEffect(() => {
      setTimeout(() => {
        setMounted(true);
      }, 0);
    }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const availableW = entry.contentRect.width;

      // ✅ Scale based on WIDTH ONLY — never let height constrain it
      // Never scale above 1 (no upscaling on large screens)
      // Never scale below 0.75 (keeps labels readable)
      const newScale = Math.min(Math.max(availableW / CARD_W, 0.75), 1.2);

      setScale(newScale);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Before hydration: render a placeholder matching the card dimensions
  // so SSR and first client render are identical — prevents hydration mismatch
  if (!mounted) {
    return (
      <div
        style={{
          width:          "100%",
          height:         `${CARD_H}px`,
          display:        "flex",
          alignItems:     "flex-start",
          justifyContent: "center",
          overflow:       "visible",
        }}
      >
        <div
          style={{
            width:     CARD_W,
            height:    CARD_H,
            flexShrink: 0,
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width:           "100%",
        height:          `${CARD_H * scale}px`,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        overflow:        "visible",
      }}
    >
      <div
        style={{
          width:           CARD_W,
          height:          CARD_H,
          transform:       `scale(${scale})`,
          transformOrigin: "top center",          // scale from top so vertical position is predictable
          flexShrink:      0,
        }}
      >
        <JourneyArc />
      </div>
    </div>
  );
}
