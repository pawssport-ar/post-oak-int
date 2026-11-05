'use client';

import type { BalancePoint } from '@post-oak/contracts';
import { scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { format, parseISO } from 'date-fns';
import { motion, useReducedMotion } from 'motion/react';
import { type KeyboardEvent, type PointerEvent, useId, useMemo, useState } from 'react';
import { moneyCompact } from '@/lib/format';
import { useSize } from './use-size';

interface BalanceChartProps {
  data: BalancePoint[];
  height: number;
  /** Lets the parent mirror the scrubbed value in its headline figure. */
  onScrub?: (point: BalancePoint | null) => void;
  label: string;
}

const MARGIN = { top: 14, right: 0, bottom: 26, left: 0 };

/**
 * Hero balance chart, drawn for a dark surface. Hovering scrubs through history and
 * the arrow keys do the same, so the values are never mouse-only.
 */
export function BalanceChart({ data, height, onScrub, label }: BalanceChartProps) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const gradientId = useId();

  const geometry = useMemo(() => {
    if (width === 0 || data.length < 2) return null;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;
    const balances = data.map((point) => point.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const pad = (max - min) * 0.22 || 1;

    const x = scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);
    const y = scaleLinear()
      .domain([min - pad, max + pad])
      .range([innerHeight + MARGIN.top, MARGIN.top]);

    const lineShape = line<BalancePoint>()
      .x((_, index) => x(index))
      .y((point) => y(point.balance))
      .curve(curveMonotoneX);
    const areaShape = area<BalancePoint>()
      .x((_, index) => x(index))
      .y0(height - MARGIN.bottom)
      .y1((point) => y(point.balance))
      .curve(curveMonotoneX);

    const labelCount = width < 480 ? 3 : 6;
    const xTicks = Array.from({ length: labelCount }, (_, index) =>
      Math.round((index * (data.length - 1)) / (labelCount - 1)),
    );

    return {
      x,
      y,
      linePath: lineShape(data) ?? '',
      areaPath: areaShape(data) ?? '',
      yTicks: y.ticks(4),
      xTicks,
    };
  }, [data, width, height]);

  const scrub = (index: number | null) => {
    setHover(index);
    onScrub?.(index === null ? null : (data[index] ?? null));
  };

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    if (!geometry) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.round(geometry.x.invert(event.clientX - bounds.left));
    scrub(Math.max(0, Math.min(data.length - 1, index)));
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    const start = hover ?? data.length - 1;
    scrub(Math.max(0, Math.min(data.length - 1, start + step)));
  };

  const active = hover === null ? null : data[hover];
  const last = data[data.length - 1];
  const dateFormat = data.length > 120 ? 'MMM yyyy' : 'MMM d';
  const xKey = `${data.length}-${data[0]?.date}`;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geometry && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => scrub(null)}
          className="block overflow-visible outline-none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#dcc48f" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#dcc48f" stopOpacity="0" />
            </linearGradient>
          </defs>

          {geometry.yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                x2={width}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                stroke="white"
                strokeOpacity="0.07"
              />
              <text
                x={width}
                y={geometry.y(tick) - 5}
                textAnchor="end"
                className="numeric fill-white/40 text-[11px]"
              >
                {moneyCompact(tick)}
              </text>
            </g>
          ))}

          {geometry.xTicks.map((index, position) => {
            const point = data[index];
            if (!point) return null;
            const anchor =
              position === 0 ? 'start' : position === geometry.xTicks.length - 1 ? 'end' : 'middle';
            return (
              <text
                key={index}
                x={geometry.x(index)}
                y={height - 6}
                textAnchor={anchor}
                className="fill-white/45 text-[11px]"
              >
                {format(parseISO(point.date), dateFormat)}
              </text>
            );
          })}

          <motion.path
            key={`area-${xKey}`}
            d={geometry.areaPath}
            fill={`url(#${gradientId})`}
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.35 }}
          />
          <motion.path
            key={`line-${xKey}`}
            d={geometry.linePath}
            fill="none"
            stroke="#dcc48f"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
          />

          {active && hover !== null ? (
            <g>
              <line
                x1={geometry.x(hover)}
                x2={geometry.x(hover)}
                y1={MARGIN.top}
                y2={height - MARGIN.bottom}
                stroke="white"
                strokeOpacity="0.3"
              />
              <circle
                cx={geometry.x(hover)}
                cy={geometry.y(active.balance)}
                r={5}
                fill="#dcc48f"
                stroke="#193e2c"
                strokeWidth={2}
              />
            </g>
          ) : (
            last && (
              <circle
                cx={geometry.x(data.length - 1)}
                cy={geometry.y(last.balance)}
                r={4}
                fill="#dcc48f"
                stroke="#193e2c"
                strokeWidth={2}
              />
            )
          )}

          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={() => scrub(null)}
            style={{ touchAction: 'pan-y' }}
          />
        </svg>
      )}
    </div>
  );
}
