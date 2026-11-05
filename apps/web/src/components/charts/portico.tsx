'use client';

import type { PillarKey, ReadinessPillar } from '@post-oak/contracts';
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

interface PorticoProps {
  pillars: ReadinessPillar[];
  tone?: 'light' | 'dark';
  active?: PillarKey | null;
  onActiveChange?: (key: PillarKey | null) => void;
  className?: string;
}

const COLUMN_WIDTH = 50;
const GAP = 18;
const SHAFT_TOP = 34;
const SHAFT_BOTTOM = 158;
const SHAFT_HEIGHT = SHAFT_BOTTOM - SHAFT_TOP;

/**
 * The firm's column, turned into a chart: five pillars of capital readiness holding
 * up one entablature. Each shaft fills to its score, like a meter on its own track.
 */
export function Portico({
  pillars,
  tone = 'light',
  active = null,
  onActiveChange,
  className,
}: PorticoProps) {
  const reduced = useReducedMotion();
  const clipPrefix = useId();
  const dark = tone === 'dark';

  const stone = dark ? 'rgb(255 255 255 / 0.11)' : 'var(--oak-100)';
  const structure = dark ? 'rgb(255 255 255 / 0.85)' : 'var(--oak-800)';
  const fill = dark ? 'var(--brass-300)' : 'var(--oak-700)';
  const flute = dark ? 'rgb(25 62 44 / 0.45)' : 'rgb(255 255 255 / 0.28)';
  const trackFlute = dark ? 'rgb(255 255 255 / 0.07)' : 'rgb(25 62 44 / 0.1)';

  const width = pillars.length * COLUMN_WIDTH + (pillars.length - 1) * GAP + 24;

  return (
    <svg
      viewBox={`0 0 ${width} 176`}
      role="img"
      aria-label={`Capital readiness: ${pillars.map((p) => `${p.label} ${p.score}`).join(', ')}`}
      className={cn('block w-full', className)}
    >
      {/* Entablature */}
      <rect x={2} y={3} width={width - 4} height={6} rx={1.5} fill={structure} />
      <rect x={8} y={11} width={width - 16} height={3} rx={1} fill={structure} opacity={0.65} />

      {pillars.map((pillar, index) => {
        const x = 12 + index * (COLUMN_WIDTH + GAP);
        const shaftX = x + 6;
        const shaftWidth = COLUMN_WIDTH - 12;
        const fillHeight = (pillar.score / 100) * SHAFT_HEIGHT;
        const focused = active === pillar.key;
        const dimmed = active !== null && !focused;
        const clipId = `${clipPrefix}-${pillar.key}`;
        return (
          <g
            key={pillar.key}
            opacity={dimmed ? 0.45 : 1}
            style={{ transition: 'opacity 160ms', cursor: onActiveChange ? 'pointer' : undefined }}
            tabIndex={onActiveChange ? 0 : undefined}
            aria-label={`${pillar.label}: ${pillar.score} of 100. ${pillar.value}`}
            onPointerEnter={() => onActiveChange?.(pillar.key)}
            onPointerLeave={() => onActiveChange?.(null)}
            onFocus={() => onActiveChange?.(pillar.key)}
            onBlur={() => onActiveChange?.(null)}
          >
            {/* Capital */}
            <rect x={x + 1} y={18} width={COLUMN_WIDTH - 2} height={5} rx={1.5} fill={structure} />
            <path
              d={`M${x + 4} 24.5h${COLUMN_WIDTH - 8}c0 3.5-2.4 6-5.5 6H${x + 9.5}c-3.1 0-5.5-2.5-5.5-6Z`}
              fill={structure}
            />

            <clipPath id={clipId}>
              <rect x={shaftX} y={SHAFT_TOP} width={shaftWidth} height={SHAFT_HEIGHT} rx={2} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
              <rect
                x={shaftX}
                y={SHAFT_TOP}
                width={shaftWidth}
                height={SHAFT_HEIGHT}
                fill={stone}
              />
              <motion.rect
                x={shaftX}
                width={shaftWidth}
                fill={fill}
                initial={{
                  y: reduced ? SHAFT_BOTTOM - fillHeight : SHAFT_BOTTOM,
                  height: reduced ? fillHeight : 0,
                }}
                animate={{ y: SHAFT_BOTTOM - fillHeight, height: fillHeight }}
                transition={{ duration: 1.1, delay: 0.15 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
              />
              {[1, 2, 3].map((line) => {
                const lineX = shaftX + (shaftWidth / 4) * line;
                return (
                  <g key={line}>
                    <line
                      x1={lineX}
                      x2={lineX}
                      y1={SHAFT_TOP}
                      y2={SHAFT_BOTTOM - fillHeight}
                      stroke={trackFlute}
                      strokeWidth={1.5}
                    />
                    <line
                      x1={lineX}
                      x2={lineX}
                      y1={SHAFT_BOTTOM - fillHeight}
                      y2={SHAFT_BOTTOM}
                      stroke={flute}
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })}
            </g>

            {/* Base */}
            <rect x={x + 3} y={160} width={COLUMN_WIDTH - 6} height={4} rx={1} fill={structure} />
            <rect x={x} y={166} width={COLUMN_WIDTH} height={6} rx={1.5} fill={structure} />
          </g>
        );
      })}
    </svg>
  );
}
