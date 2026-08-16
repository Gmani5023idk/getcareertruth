"use client";

import { useState, useEffect, useRef } from "react";

// ─── Theme tokens ────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    outerBg:
      "#080D1A",
    cardBg:
      "linear-gradient(140deg, rgba(14,22,46,0.98) 0%, rgba(8,13,26,1) 100%)",
    cardBorder: "1px solid rgba(59,158,255,0.18)",
    cardShadow:
      "0 0 90px rgba(0,229,255,0.06), 0 0 0 1px rgba(59,158,255,0.07)",
    titleColor: "rgba(0,229,255,0.5)",
    nodeLabelBg: (rgb: string) => `rgba(${rgb},0.15)`,
    nodeDefaultBg: "rgba(10,18,40,0.75)",
    nodeSublabelColor: "rgba(255,255,255,0.42)",
    bottomSublabelColor: "rgba(255,255,255,0.32)",
  },
  light: {
    outerBg:
      "linear-gradient(135deg,#eef2ff 0%,#faf5ff 50%,#ecfbff 100%)",
    cardBg: "#ffffff",
    cardBorder: "1px solid rgba(59,158,255,0.22)",
    cardShadow:
      "0 8px 40px rgba(0,100,180,0.10), 0 0 0 1px rgba(59,158,255,0.10)",
    titleColor: "rgba(0,140,180,0.85)",
    nodeLabelBg: (rgb: string) => `rgba(${rgb},0.12)`,
    nodeDefaultBg: "rgba(255,255,255,0.92)",
    nodeSublabelColor: "rgba(60,60,90,0.7)",
    bottomSublabelColor: "rgba(60,60,90,0.6)",
  },
} as const;

// ─── Bezier curve helper ──────────────────────────────────────────────────────
function bezierPoint(t: number) {
  const u = 1 - t;
  return {
    x: u * u * u * 80 + 3 * u * u * t * 200 + 3 * u * t * t * 420 + t * t * t * 570,
    y: u * u * u * 390 + 3 * u * u * t * 80 + 3 * u * t * t * 430 + t * t * t * 80,
  };
}

// ─── Node icon sub-components ─────────────────────────────────────────────────
function ConfusedIcon({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x - 14}, ${y - 52})`} opacity={0.88}>
      <circle cx={14} cy={7} r={7.5} fill={c} opacity={0.85} />
      <path d="M14 15 Q7 24 9 36 Q11 44 14 46" stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.8} />
      <path d="M11 21 Q3 30 5 38" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.65} />
      <path d="M17 21 Q23 30 21 38" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.65} />
      <text x={23} y={5} fill={c} fontSize={11} fontFamily="Georgia, serif" opacity={0.7}>?</text>
      <text x={-4} y={10} fill={c} fontSize={8} fontFamily="Georgia, serif" opacity={0.4}>?</text>
    </g>
  );
}

function CallIcon({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x - 14}, ${y - 52})`} opacity={0.95}>
      <circle cx={14} cy={7} r={7.5} fill={c} opacity={0.9} />
      <path d="M14 15 L14 40" stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M14 21 Q23 19 27 14" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.85} />
      <rect x={25} y={8} width={6} height={10} rx={2} fill={c} opacity={0.85} />
      <path d="M14 24 Q6 28 4 34" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
      <path d="M33 10 Q36 14 33 18" stroke={c} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.5} />
      <path d="M35 8 Q39 14 35 20" stroke={c} strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.3} />
    </g>
  );
}

function SuccessIcon({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x - 14}, ${y - 56})`} opacity={0.95}>
      <circle cx={14} cy={7} r={7.5} fill={c} opacity={0.9} />
      <path d="M14 15 L14 42" stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M14 21 Q4 12 1 5" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.85} />
      <path d="M14 21 Q24 12 27 5" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.85} />
      <text x={-10} y={2} fill={c} fontSize={9} opacity={0.7}>✦</text>
      <text x={27} y={4} fill={c} fontSize={7} opacity={0.65}>✦</text>
      <text x={10} y={-5} fill={c} fontSize={6} opacity={0.5}>✦</text>
    </g>
  );
}

// ─── Waypoint data ────────────────────────────────────────────────────────────
const CYAN = "#00E5FF";

const WAYPOINTS = [
  { t: 0,   label: "Student Confused",  sublabel: "No direction. No clarity.",      color: "#7B8FE8", rgb: "123,143,232", icon: "confused" },
  { t: 0.5, label: "15-min Real Call",  sublabel: "Verified employee. Real truth.", color: CYAN,       rgb: "0,229,255",   icon: "call"     },
  { t: 1,   label: "Dream Job Clarity", sublabel: "Path clear. Future secured.",    color: "#4ADE80",  rgb: "74,222,128",  icon: "success"  },
] as const;

// ─── Particle type ────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  opacity: number;
  size: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface JourneyArcProps {
  /** Pass "dark" or "light" explicitly, or omit to auto-detect from
   *  document.documentElement.classList (next-themes / class strategy). */
  theme?: "dark" | "light";
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function JourneyArc({ theme: themeProp }: JourneyArcProps) {
  // ── Auto theme detection via MutationObserver ──
  const [autoTheme, setAutoTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Initial theme detection after mount (impure DOM access moved out of render)
    if (typeof document !== "undefined" && !themeProp) {
      setAutoTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
  }, [themeProp]);

  useEffect(() => {
    if (themeProp) return; // skip observer when explicit prop provided
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setAutoTheme(root.classList.contains("dark") ? "dark" : "light");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [themeProp]);

  const theme = THEMES[themeProp ?? autoTheme];

  // ── Animation state ──
  const [particles, setParticles]       = useState<Particle[]>([]);
  const [pulse, setPulse]               = useState(0);
  const [progress, setProgress]         = useState(0);
  const [trailOpacity, setTrailOpacity] = useState(0.9);
  const [hoveredIdx, setHoveredIdx]     = useState<number | null>(null);

  const rafRef        = useRef<number>(0);
  const pidRef        = useRef(0);
  const lastSpawnRef  = useRef(0);

  useEffect(() => {
    let startTime: number | null = null;

    rafRef.current = requestAnimationFrame(function tick(now: number) {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;

      // Pulse (used for glow breathing)
      setPulse(0.5 * Math.sin(elapsed / 900) + 0.5);

      // Travel cycle: 3600 ms travel + 1000 ms pause = 4600 ms total
      const cycle = elapsed % 4600;
      const t     = cycle < 3600 ? cycle / 3600 : 1;
      const opc   = cycle > 3700 ? 0.9 * Math.max(0, (4600 - cycle) / 900) : 0.9;
      setProgress(t);
      setTrailOpacity(opc);

      // Spawn particles
      if (now - lastSpawnRef.current > 160) {
        lastSpawnRef.current = now;
        const pos = bezierPoint(t);
        const p: Particle = {
          id:      pidRef.current++,
          x:       pos.x + (Math.random() - 0.5) * 18,
          y:       pos.y + (Math.random() - 0.5) * 18,
          opacity: 0.6 + 0.4 * Math.random(),
          size:    1.5 + 3 * Math.random(),
        };
        setParticles(prev => [...prev.slice(-40), p]);
      }

      // Decay existing particles
      setParticles(prev =>
        prev.map(p => ({ ...p, opacity: p.opacity * 0.972 })).filter(p => p.opacity > 0.03)
      );

      rafRef.current = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Derived: waypoint screen positions ──
  const nodes = WAYPOINTS.map(w => ({ ...w, pos: bezierPoint(w.t) }));

  // ── Trail path ──
  const trailD = Array.from({ length: 51 }, (_, i) => {
    const pt = bezierPoint((i / 50) * progress);
    return `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }).join(" ");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.outerBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', 'Sora', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Card ── */}
      <div
        style={{
          width: 660,
          height: 520,
          position: "relative",
          borderRadius: 24,
          background: theme.cardBg,
          border: theme.cardBorder,
          boxShadow: theme.cardShadow,
          overflow: "hidden",
        }}
      >
        {/* Radial glow overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 65% 55% at 50% 52%, rgba(0,229,255,${0.025 + 0.022 * pulse}) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Grid lines */}
        <svg width="660" height="520" style={{ position: "absolute", inset: 0, opacity: 0.035 }}>
          {[...Array(12)].map((_, i) => (
            <line key={`v${i}`} x1={60 * i} y1={0} x2={60 * i} y2={520} stroke={CYAN} strokeWidth={0.5} />
          ))}
          {[...Array(9)].map((_, i) => (
            <line key={`h${i}`} x1={0} y1={65 * i} x2={660} y2={65 * i} stroke={CYAN} strokeWidth={0.5} />
          ))}
        </svg>

        {/* Title */}
        <div style={{ position: "absolute", top: 22, left: 0, right: 0, textAlign: "center", zIndex: 10 }}>
          <span style={{
            fontSize: 9.5,
            letterSpacing: "0.24em",
            color: theme.titleColor,
            textTransform: "uppercase",
            fontWeight: 600,
          }}>
            Your Career Transformation
          </span>
        </div>

        {/* ── Main SVG canvas ── */}
        <svg viewBox="0 0 660 520" width="660" height="520" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="jArcGhost" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#7B8FE8" stopOpacity={0.5} />
              <stop offset="50%"  stopColor={CYAN}    stopOpacity={0.7} />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="jTrailG" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={CYAN} stopOpacity={0}   />
              <stop offset="55%"  stopColor={CYAN} stopOpacity={0.8} />
              <stop offset="100%" stopColor={CYAN} stopOpacity={1}   />
            </linearGradient>
            <filter id="jGlow">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="jStrongGlow">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="jSoftGlow">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Ghost guide path */}
          <path
            d="M80 390 C200 80 420 430 570 80"
            stroke="url(#jArcGhost)"
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="5 8"
            opacity={0.22}
          />

          {/* Animated trail */}
          <path
            d={trailD}
            stroke="url(#jTrailG)"
            strokeWidth={3}
            fill="none"
            filter="url(#jGlow)"
            opacity={trailOpacity}
          />

          {/* Particles */}
          {particles.map(p => (
            <circle
              key={p.id}
              cx={p.x} cy={p.y} r={p.size}
              fill={CYAN}
              opacity={0.75 * p.opacity}
              filter="url(#jSoftGlow)"
            />
          ))}

          {/* Waypoint nodes */}
          {nodes.map((node, idx) => {
            const isHovered = hoveredIdx === idx;
            const dotR      = isHovered ? 14 : 10 + 2.5 * pulse;

            return (
              <g
                key={idx}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Outer glow ring */}
                <circle
                  cx={node.pos.x} cy={node.pos.y}
                  r={dotR + 14}
                  fill={node.color}
                  opacity={0.06 + 0.05 * pulse}
                  filter="url(#jStrongGlow)"
                />
                {/* Stroke ring */}
                <circle
                  cx={node.pos.x} cy={node.pos.y}
                  r={dotR + 5}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1.5}
                  opacity={0.28 + 0.18 * pulse}
                />
                {/* Main dot */}
                <circle
                  cx={node.pos.x} cy={node.pos.y}
                  r={dotR}
                  fill={node.color}
                  opacity={0.92}
                  filter="url(#jGlow)"
                />
                {/* Center white dot */}
                <circle cx={node.pos.x} cy={node.pos.y} r={4} fill="white" opacity={0.88} />

                {/* Icon figure */}
                {idx === 0 && <ConfusedIcon x={node.pos.x} y={node.pos.y} c={node.color} />}
                {idx === 1 && <CallIcon    x={node.pos.x} y={node.pos.y} c={node.color} />}
                {idx === 2 && <SuccessIcon x={node.pos.x} y={node.pos.y} c={node.color} />}

                {/* Dotted connector to label */}
                <line
                  x1={node.pos.x} y1={node.pos.y + 17}
                  x2={node.pos.x} y2={node.pos.y + (idx === 1 ? 88 : 76)}
                  stroke={node.color}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                  opacity={0.32}
                />
              </g>
            );
          })}
        </svg>

        {/* ── Label cards (HTML overlay) ── */}
        {nodes.map((node, idx) => {
          const isHovered = hoveredIdx === idx;
          const topOffset = idx === 1 ? 90 : 78;

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left:      node.pos.x,
                top:       node.pos.y + topOffset,
                transform: "translateX(-50%)",
                textAlign: "center",
                zIndex:    20,
                pointerEvents: "none",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  background:     isHovered ? theme.nodeLabelBg(node.rgb) : theme.nodeDefaultBg,
                  border:         `1px solid ${node.color}`,
                  borderRadius:   10,
                  padding:        "7px 14px",
                  backdropFilter: "blur(12px)",
                  boxShadow:      isHovered ? `0 0 24px ${node.color}44` : "none",
                  whiteSpace:     "nowrap",
                  transition:     "all 0.3s ease",
                }}
              >
                <div style={{ color: node.color, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.03em" }}>
                  {node.label}
                </div>
                <div style={{ color: theme.nodeSublabelColor, fontSize: 9.5, marginTop: 2 }}>
                  {node.sublabel}
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Bottom stats ── */}
        <div
          style={{
            position:       "absolute",
            bottom:         20,
            left:           0,
            right:          0,
            display:        "flex",
            justifyContent: "center",
            gap:            28,
            zIndex:         20,
          }}
        >
          {[
            { v: "15 min", l: "Per Session"  },
            { v: "₹199",   l: "Starting At"  },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ color: CYAN, fontSize: 13, fontWeight: 700 }}>{item.v}</div>
              <div style={{ color: theme.bottomSublabelColor, fontSize: 9, letterSpacing: "0.09em", textTransform: "uppercase" }}>
                {item.l}
              </div>
            </div>
          ))}
        </div>

        {/* Ambient glow blobs */}
        <div style={{
          position: "absolute", top: 50, right: 30,
          width: 90, height: 90, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%)",
          filter: "blur(22px)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: 70, left: 25,
          width: 110, height: 110, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)",
          filter: "blur(28px)", pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}
